import { Renderer } from '@/renderer/renderer';
import {
	CompositeModes,
	IShadow,
	RenderContext,
} from '@/renderer/renderer-context';
import { IRootState } from '@/store';
import { IObject } from '@/store/objects';
import { IPanel } from '@/store/panels';
import { SpriteFilter } from '@/store/sprite-options';
import { rotateAround } from '@/util/rotation';
import { DeepReadonly } from 'ts-essentials';
import { Store } from 'vuex';

/**
 * An offscreen renderable is the baseclass for all renderable objects in DDDG. It (generally) first renders the object
 * onto a seperate canvas, then renders than onto the scene. This prevents seams when scaling objects that consist of
 * multiple sprites and serves as a cache to prevent frequent rerendering of complex objects. It also allows for pixel
 * perfect hit tests for clicking on objects.
 */
export abstract class OffscreenRenderable<Obj extends IObject> {
	protected localRenderer: Renderer | null = null;
	private lastVersion: any = null;
	private hitDetectionFallback = false;
	protected renderable: boolean = false;
	private _disposed: boolean = false;
	protected isTalking: boolean = false;

	public constructor(public obj: DeepReadonly<Obj>) {}

	protected abstract readonly canvasHeight: number;
	protected abstract readonly canvasWidth: number;

	// The dimentions used to draw the local canvas onto the target. Is different from `canvasHeight` and `canvasWidth` to allow scaling
	protected abstract readonly canvasDrawHeight: number;
	protected abstract readonly canvasDrawWidth: number;
	protected abstract readonly canvasDrawPosX: number;
	protected abstract readonly canvasDrawPosY: number;
	protected abstract renderLocal(rx: RenderContext): Promise<void>;

	public getAnchor(): DOMPointReadOnly {
		return new DOMPointReadOnly(this.x, this.y);
	}

	public getRotationAnchor(): DOMPointReadOnly {
		return new DOMPointReadOnly(0, this.height / 2);
	}

	public getZoomAnchor(): DOMPointReadOnly {
		return new DOMPointReadOnly(0, this.height);
	}

	public getLocalSize(): DOMPointReadOnly {
		return new DOMPointReadOnly(this.obj.width, this.obj.height);
	}

	protected lastHq: boolean = false;

	protected readonly ready = Promise.resolve();

	public get id(): IObject['id'] {
		return this.obj.id;
	}

	protected get x(): number {
		return this.obj.x;
	}
	protected get y(): number {
		return this.obj.y;
	}
	protected get version(): number {
		return this.obj.version;
	}
	protected get flip(): boolean {
		return this.obj.flip;
	}
	protected get rotation(): number {
		return (this.obj.rotation / 180) * Math.PI;
	}
	protected get composite(): CompositeModes {
		return this.obj.composite;
	}
	protected get filters(): DeepReadonly<SpriteFilter[]> {
		return this.obj.filters;
	}
	protected get width(): number {
		return this.obj.width;
	}
	protected get height(): number {
		return this.obj.height;
	}
	protected get allowSkippingLocalCanvas(): boolean {
		return true;
	}

	public async updateLocalCanvas(hq: boolean, skipLocal: boolean) {
		if (this._disposed) throw new Error('Disposed renderable called');
		await this.ready;
		const width = this.canvasWidth;
		const height = this.canvasHeight;
		if (height === 0 && width === 0) {
			this.renderable = false;
			return;
		}
		this.renderable = true;
		this.lastHq = hq;

		if (skipLocal) return;

		if (
			this.localRenderer &&
			!this.localRenderer.disposed &&
			this.localRenderer.height === height &&
			this.localRenderer.width === width
		) {
			// Just reuse the renderer.
		} else {
			if (this.localRenderer) {
				this.localRenderer.dispose();
			}
			this.localRenderer = new Renderer(width, height);
		}
		try {
			await this.localRenderer.render(this.renderLocal.bind(this), hq);
		} catch (e) {
			this.localRenderer.dispose();
			this.localRenderer = null;
			throw e;
		}
	}

	public needsRedraw(): boolean {
		return this.localRenderer === null || this.lastVersion !== this.version;
	}

	public getHitboxRotation(): [number, { x: number; y: number } | undefined] {
		return [
			this.flip ? -this.rotation : this.rotation,
			{
				x: this.x,
				y: this.y + this.height / 2,
			},
		];
	}

	public getRenderRotation(): [number, { x: number; y: number } | undefined] {
		return this.getHitboxRotation();
	}

	public async render(
		selected: SelectedState,
		rx: RenderContext,
		skipLocal: boolean
	) {
		if (this._disposed) throw new Error('Disposed renderable called');
		if (!this.canSkipLocal()) skipLocal = false;

		if (selected !== SelectedState.None || this.localRenderer)
			skipLocal = false;

		const needRedraw = this.lastHq !== rx.hq || this.needsRedraw();

		if (needRedraw) await this.updateLocalCanvas(rx.hq, skipLocal);

		this.lastVersion = this.version;

		if (!this.renderable) return;

		if (
			window.dddg_dbg_paint_hitboxes == 'all' ||
			(window.dddg_dbg_paint_hitboxes == 'selected' &&
				selected !== SelectedState.None)
		) {
			const hitbox = this.getHitbox();
			const [angle, anchor] = this.getHitboxRotation();
			rx.drawRect({
				h: hitbox.y1 - hitbox.y0,
				w: hitbox.x1 - hitbox.x0,
				x: hitbox.x0,
				y: hitbox.y0,
				rotation: angle,
				rotationAnchor: anchor,
				outline: {
					style: '#000',
					width: 2,
				},
			});
		}

		const [rotation, rotationAnchor] = this.getRenderRotation();

		let shadow: IShadow | undefined = undefined;

		switch (selected) {
			case SelectedState.None:
				shadow = undefined;
				break;
			case SelectedState.Selected:
				shadow = { blur: 20, color: 'red' };
				break;
			case SelectedState.Focused:
				shadow = { blur: 20, color: 'blue' };
				break;
			case SelectedState.Both:
				shadow = { blur: 20, color: 'purple' };
				break;
		}

		if (skipLocal) {
			await rx.customTransform((ctx) => {
				ctx.translate(this.canvasDrawPosX, this.canvasDrawPosY);
			}, this.renderLocal.bind(this));
		} else {
			rx.drawImage({
				image: this.localRenderer!,
				x: this.canvasDrawPosX,
				y: this.canvasDrawPosY,
				w: this.canvasDrawWidth,
				h: this.canvasDrawHeight,
				rotation,
				rotationAnchor,
				flip: this.flip,
				shadow: shadow && rx.preview ? shadow : undefined,
				composite: this.composite,
				filters: this.filters,
			});
		}

		let point = this.getAnchor();
		rx.fsCtx.fillStyle = '#ff0';
		rx.fsCtx.fillRect(point.x - 2, point.y - 2, 5, 5);
		rx.fsCtx.fillText(this.obj.type + '_pos', point.x, point.y);

		await rx.customTransform(
			(rx) => {
				rx.translate(point.x, point.y);
			},
			(rx) => {
				const rotPoint = this.getRotationAnchor();
				rx.fsCtx.fillStyle = '#f0f';
				rx.fsCtx.fillRect(rotPoint.x - 2, rotPoint.y - 2, 5, 5);
				rx.fsCtx.fillText(this.obj.type + '_rot', rotPoint.x, rotPoint.y);

				rx.customTransform(
					(rx) => {
						rx.translate(rotPoint.x, rotPoint.y);
						rx.rotate(this.rotation);
						rx.translate(-rotPoint.x, -rotPoint.y);
					},
					(rx) => {
						const zoomPoint = this.getZoomAnchor();
						rx.fsCtx.fillStyle = '#0ff';
						rx.fsCtx.fillRect(zoomPoint.x - 2, zoomPoint.y - 2, 5, 5);
						rx.fsCtx.fillText(
							this.obj.type + '_zoom',
							zoomPoint.x,
							zoomPoint.y
						);
					}
				);
			}
		);

		rx.fsCtx.resetTransform();
	}

	protected canSkipLocal(): boolean {
		return (
			this.allowSkippingLocalCanvas &&
			this.obj.filters.length === 0 &&
			!this.obj.flip
		);
	}

	public hitTest(hx: number, hy: number): boolean {
		if (!this.localRenderer) return false;

		const hitbox = this.getHitbox();

		const [angle, anchor] = this.getHitboxRotation();
		const [rotatedHitX, rotatedHitY] = anchor
			? rotateAround(hx, hy, anchor.x, anchor.y, -angle)
			: [hx, hy];

		const hit =
			rotatedHitX >= hitbox.x0 &&
			rotatedHitX <= hitbox.x1 &&
			rotatedHitY >= hitbox.y0 &&
			rotatedHitY <= hitbox.y1;

		if (this.obj.type === 'choice') {
			console.log('Simple hitbox test: ', hit);
		}

		if (!hit) return false;
		// We can't do pixel perfect detection and we have a hitbox hit -> true
		if (this.hitDetectionFallback) return true;

		try {
			return this.pixelPerfectHitTest(hx, hy);
		} catch (e) {
			this.hitDetectionFallback = true;
		}

		return true;
	}

	public pixelPerfectHitTest(x: number, y: number): boolean {
		if (!this.localRenderer) return false;
		const [angle, anchor] = this.getRenderRotation();
		const [rotatedHitX, rotatedHitY] = anchor
			? rotateAround(x, y, anchor.x, anchor.y, -angle)
			: [x, y];

		const innerX = Math.round(rotatedHitX - this.canvasDrawPosX);
		const innerY = Math.round(rotatedHitY - this.canvasDrawPosY);

		const canvasDrawWidth = this.canvasDrawWidth;
		const canvasDrawHeight = this.canvasDrawHeight;

		if (
			innerX >= 0 &&
			innerX <= canvasDrawWidth &&
			innerY >= 0 &&
			innerY <= canvasDrawHeight
		) {
			const flippedX = this.flip ? this.canvasDrawWidth - innerX : innerX;
			const scaleX = this.canvasWidth / this.canvasDrawWidth;
			const scaleY = this.canvasHeight / this.canvasDrawHeight;
			const data = this.localRenderer.getDataAt(
				Math.round(flippedX * scaleX),
				Math.round(innerY * scaleY)
			);

			if (this.obj.type === 'choice') {
				console.log('pixel test: ', data[3] !== 0);
			}
			return data[3] !== 0;
		}
		return false;
	}

	/**
	 * Returns the hitbox of the object, *not* taking into account any rotation (as that would just inflate the hitbox and reduce accuracy)
	 * To manually apply rotation to it, rotate your hit test by `this.rotation` around the center of the hitbox.
	 */
	public getHitbox(): IHitbox {
		return {
			x0: this.x - this.width / 2,
			x1: this.x + this.width / 2,
			y0: this.y,
			y1: this.y + this.height,
		};
	}

	public updatedContent(
		_current: Store<DeepReadonly<IRootState>>,
		_panelId: IPanel['id']
	): void {}

	public get disposed(): boolean {
		return this._disposed;
	}

	public dispose(): void {
		this._disposed = true;
		this.localRenderer?.dispose();
		this.localRenderer = null;
	}
}

export enum SelectedState {
	None = 0b00,
	Selected = 0b01,
	Focused = 0b10,
	Both = 0b11,
}

declare global {
	interface Window {
		dddg_dbg_paint_hitboxes: 'none' | 'selected' | 'all';
	}
}

window.dddg_dbg_paint_hitboxes = 'none';
