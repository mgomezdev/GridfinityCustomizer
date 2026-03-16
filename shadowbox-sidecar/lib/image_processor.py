# TODO: Implement with real OpenCV image processing logic
# Expected to process an image and detect tool silhouette using a red reference square
class ImageProcessor:
    def __init__(self, image_bytes: bytes, thickness_mm: float):
        self.image_bytes = image_bytes
        self.thickness_mm = thickness_mm

    def process(self) -> dict:
        """
        Process the image and extract the tool silhouette.

        Returns:
            dict with keys:
              - svg_path (str): SVG path string of the tool outline
              - width_mm (float): width of the bounding box in mm
              - height_mm (float): height of the bounding box in mm
              - scale_mm_per_px (float): scale factor derived from red reference square

        Raises:
            ValueError: if no red reference square found or processing fails
        """
        raise NotImplementedError("TODO: implement image processing with OpenCV")
