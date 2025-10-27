declare module 'simplelightbox' {
  type Options = {
    sourceAttr?: string;
    captions?: boolean;
    captionType?: 'attr' | 'data';
    captionsData?: string;
    captionDelay?: number;
    captionPosition?: 'top' | 'bottom';
    closeText?: string;
    zoomText?: string;
    fileExt?: string | false;
    animationSlide?: boolean;
    animationSpeed?: number;
    preloading?: boolean;
    enableKeyboard?: boolean;
    loop?: boolean;
    rel?: boolean;
    docClose?: boolean;
    download?: string;
    swipeTolerance?: number;
    spinner?: boolean;
    className?: string;
    widthRatio?: number;
    heightRatio?: number;
    scaleImageToRatio?: boolean;
    videoMaxWidth?: string;
    appendTo?: string | HTMLElement;
    history?: boolean;
    throttleInterval?: number;
    doubleTapZoom?: number;
    maxScale?: number;
    minScale?: number;
  };

  export default class SimpleLightbox {
    constructor(selector: string | HTMLElement | NodeList, options?: Options);
    open(index?: number): void;
    close(): void;
    refresh(): void;
    destroy(): void;
  }
}
