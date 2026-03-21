import cv2
import numpy as np

# The red reference square in the photo must be exactly this size
REFERENCE_SQUARE_MM = 42.0


class ImageProcessor:
    def __init__(self, image_bytes: bytes, thickness_mm: float):
        self.image_bytes = image_bytes
        self.thickness_mm = thickness_mm

    def process(self) -> dict:
        nparr = np.frombuffer(self.image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")

        scale_mm_per_px = self._find_scale(img)
        contour = self._find_tool_contour(img)
        svg_path, width_mm, height_mm = self._contour_to_svg(contour, scale_mm_per_px)

        return {
            "svg_path": svg_path,
            "width_mm": width_mm,
            "height_mm": height_mm,
            "scale_mm_per_px": scale_mm_per_px,
        }

    def _find_scale(self, img: np.ndarray) -> float:
        """Detect the red reference square and return mm-per-pixel scale."""
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Red wraps around 0/180 in HSV — check both ranges
        mask1 = cv2.inRange(hsv, np.array([0, 120, 70]), np.array([10, 255, 255]))
        mask2 = cv2.inRange(hsv, np.array([170, 120, 70]), np.array([180, 255, 255]))
        red_mask = cv2.bitwise_or(mask1, mask2)

        kernel = np.ones((7, 7), np.uint8)
        red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel)
        red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(
            red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        best = None
        best_squareness = float("inf")
        h_img, w_img = img.shape[:2]
        min_area = (min(h_img, w_img) * 0.01) ** 2

        for c in contours:
            area = cv2.contourArea(c)
            if area < min_area:
                continue
            x, y, w, h = cv2.boundingRect(c)
            aspect = max(w, h) / max(min(w, h), 1)
            if aspect > 2.5:
                continue
            score = abs(aspect - 1.0)
            if score < best_squareness:
                best_squareness = score
                best = c

        if best is None:
            raise ValueError(
                "No red reference square found. Place a 42x42 mm red square "
                "in the photo so the scale can be determined."
            )

        x, y, w, h = cv2.boundingRect(best)
        side_px = (w + h) / 2.0
        return REFERENCE_SQUARE_MM / side_px

    def _find_tool_contour(self, img: np.ndarray) -> np.ndarray:
        """Find the largest foreground contour — assumed to be the tool."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(
            blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )

        kernel = np.ones((5, 5), np.uint8)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=3)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(
            thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if not contours:
            raise ValueError("No tool contour found in image")

        return max(contours, key=cv2.contourArea)

    def _contour_to_svg(
        self, contour: np.ndarray, scale_mm_per_px: float
    ) -> tuple[str, float, float]:
        """Simplify contour and return SVG path + bounding box in mm."""
        epsilon = 0.015 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        points = approx.reshape(-1, 2).astype(float)

        points *= scale_mm_per_px
        cx = (points[:, 0].min() + points[:, 0].max()) / 2.0
        cy = (points[:, 1].min() + points[:, 1].max()) / 2.0
        points[:, 0] -= cx
        points[:, 1] -= cy

        width_mm = float(points[:, 0].max() - points[:, 0].min())
        height_mm = float(points[:, 1].max() - points[:, 1].min())

        parts = [f"M {points[0, 0]:.2f} {points[0, 1]:.2f}"]
        for pt in points[1:]:
            parts.append(f"L {pt[0]:.2f} {pt[1]:.2f}")
        parts.append("Z")

        return " ".join(parts), width_mm, height_mm
