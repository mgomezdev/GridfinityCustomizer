export interface WalkthroughStep {
  id: string;
  title: string;
  body: string;
  target: string;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: 'place-bin',
    title: 'Drag a bin onto your grid',
    body: 'Pick any bin from the library on the left and drag it onto the grid to place it.',
    target: '.library-item-card',
  },
  {
    id: 'save-grid',
    title: 'Save your layout',
    body: 'Give your layout a name and save it — you can come back and edit it anytime.',
    target: '.layout-save-btn',
  },
  {
    id: 'submit-order',
    title: 'Submit your order',
    body: 'When your layout is ready, hit Submit to send it in as an order. You can track it from your layouts panel.',
    target: '.layout-submit-btn',
  },
];
