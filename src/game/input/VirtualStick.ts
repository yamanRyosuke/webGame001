export class VirtualStick {
  private element!: HTMLElement;
  private stick!: HTMLElement;
  private isDragging = false;
  private startPos = { x: 0, y: 0 };
  private currentPos = { x: 0, y: 0 };
  private input = { x: 0, y: 0 };

  constructor() {
    this.createElement();
    this.setupEvents();
  }

  private createElement() {
    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 120px;
      height: 120px;
      border-radius: 60px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.3);
      z-index: 1000;
      touch-action: none;
    `;

    this.stick = document.createElement('div');
    this.stick.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 40px;
      height: 40px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.6);
      transform: translate(-50%, -50%);
      transition: transform 0.1s ease;
    `;

    this.element.appendChild(this.stick);
  }

  private setupEvents() {
    this.element.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.element.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.element.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onTouchStart(e: TouchEvent) {
    e.preventDefault();
    this.isDragging = true;
    const rect = this.element.getBoundingClientRect();
    this.startPos.x = rect.left + rect.width / 2;
    this.startPos.y = rect.top + rect.height / 2;
  }

  private onTouchMove(e: TouchEvent) {
    if (!this.isDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    const deltaX = touch.clientX - this.startPos.x;
    const deltaY = touch.clientY - this.startPos.y;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 40;
    
    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX);
      this.currentPos.x = Math.cos(angle) * maxDistance;
      this.currentPos.y = Math.sin(angle) * maxDistance;
    } else {
      this.currentPos.x = deltaX;
      this.currentPos.y = deltaY;
    }

    this.input.x = this.currentPos.x / maxDistance;
    this.input.y = this.currentPos.y / maxDistance;

    this.stick.style.transform = `translate(${-50 + this.currentPos.x}%, ${-50 + this.currentPos.y}%)`;
  }

  private onTouchEnd() {
    this.isDragging = false;
    this.currentPos.x = 0;
    this.currentPos.y = 0;
    this.input.x = 0;
    this.input.y = 0;
    this.stick.style.transform = 'translate(-50%, -50%)';
  }

  getInput() {
    return { ...this.input };
  }

  getElement() {
    return this.element;
  }

  dispose() {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}