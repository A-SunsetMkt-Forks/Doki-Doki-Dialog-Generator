import { getBuildInAsset } from '@/asset-manager';
import getConstants from '@/constants';
import * as TBConstants from '@/constants/game_modes/ddlc/text-box';
import {
	dotColorDelta,
	dotPatternSize,
	dotRadius,
	nameboxBackgroundDelta,
	nameboxGradientEndDelta,
	nameboxGradientMiddleStopPosition,
	nameboxRounding,
	nameboxTextOutlineDelta,
	textboxDefaultColor,
	textboxOutlineColorDelta,
	textboxOutlineWidth,
	textboxRounding,
	textboxRoundingBuffer,
} from '@/constants/game_modes/ddlc/text-box-custom';
import { roundedRectangle, roundedTopRectangle } from '@/renderer/path-tools';
import { Renderer } from '@/renderer/renderer';
import { RenderContext } from '@/renderer/renderer-context';
import { RGBAColor } from '@/util/colors/rgb';
import { ITextboxRenderer } from '../textbox';
import { DdlcBase } from './ddlc-base';

export class Custom extends DdlcBase implements ITextboxRenderer {
	static readonly id = 'custom';
	static readonly label: string = 'Custom';
	static readonly priority: number = 0;
	static readonly gameMode: string = 'ddlc';

	public static get resizable() {
		return true;
	}

	public get height() {
		return this.obj.height + TBConstants.NameboxHeight;
	}

	public get width() {
		return this.obj.width;
	}

	public get nameboxWidth() {
		if (this.refObject && this.refObject.nameboxWidth !== null) {
			return this.refObject.nameboxWidth;
		}
		if (this.obj.customNameboxWidth !== null)
			return this.obj.customNameboxWidth;
		return TBConstants.NameboxWidth;
	}

	public get nameboxHeight() {
		return TBConstants.NameboxHeight;
	}

	public get nameboxOffsetX() {
		return TBConstants.NameboxXOffset;
	}

	public get nameboxOffsetY() {
		return TBConstants.NameboxTextYOffset;
	}

	public get nameboxStyle() {
		return {
			...TBConstants.NameboxTextStyle,
			strokeColor: this.nameboxOutlineColor,
			color: '#FFFFFF',
		};
	}

	public get textOffsetX() {
		return TBConstants.TextBoxTextXOffset;
	}

	public get textOffsetY() {
		return TBConstants.TextBoxTextYOffset;
	}

	public get customColor(): string {
		if (this.obj.overrideColor) return this.obj.customColor;
		const refObject = this.refObject;
		if (refObject != null && refObject.textboxColor != null)
			return refObject.textboxColor;
		return textboxDefaultColor;
	}

	private get nameboxOutlineColor(): string {
		if (this.obj.deriveCustomColors) {
			const base = RGBAColor.fromCss(this.customColor).toHSL();
			return base.shift(nameboxTextOutlineDelta).toRgb().toCss();
		}
		return this.obj.customNameboxStroke;
	}

	private get nameboxBackgroundColor(): string {
		if (this.obj.deriveCustomColors) {
			const base = RGBAColor.fromCss(this.customColor).toHSL();
			return base.shift(nameboxBackgroundDelta).toRgb().toCss();
		}
		return this.obj.customNameboxColor;
	}

	protected backgroundImage = 'textbox';
	protected xOffset = 0;

	protected async renderNamebox(
		rx: RenderContext,
		x: number,
		y: number
	): Promise<void> {
		const w = this.nameboxWidth;
		const h = this.nameboxHeight;
		await rx.customTransform(
			(ctx) => {
				ctx.beginPath();
				roundedTopRectangle(ctx, x, y, w, h, nameboxRounding);
				ctx.clip();
			},
			(subRx) => {
				const gradient = subRx.linearGradient(x, y, x, y + h);
				const baseBG = RGBAColor.fromCss(this.nameboxBackgroundColor);
				const color = new RGBAColor(baseBG.r, baseBG.g, baseBG.b, 0.95);
				const targetColor = color
					.toHSL()
					.shift(nameboxGradientEndDelta)
					.toRgb();
				gradient.addColorStop(0, color.toCss());
				gradient.addColorStop(nameboxGradientMiddleStopPosition, color.toCss());
				gradient.addColorStop(1, targetColor.toCss());
				subRx.drawRect({
					x,
					y,
					w: this.obj.width,
					h,
					fill: {
						style: gradient,
					},
				});
			}
		);
	}

	protected async renderBackdrop(
		rx: RenderContext,
		x: number,
		y: number
	): Promise<void> {
		const hslColor = RGBAColor.fromCss(this.customColor).toHSL();
		const dotPattern = new Renderer(dotPatternSize, dotPatternSize);
		await dotPattern.render((dotRx: RenderContext) => {
			const fill = {
				style: hslColor.shift(dotColorDelta).toRgb().toCss(),
			};

			function drawDot(dotX: number, dotY: number) {
				dotRx.drawPath({
					path: (ctx) => {
						ctx.ellipse(dotX, dotY, dotRadius, dotRadius, 0, 0, 2 * Math.PI);
					},
					fill,
				});
			}

			drawDot(0, 0);
			drawDot(dotPatternSize, 0);
			drawDot(0, dotPatternSize);
			drawDot(dotPatternSize, dotPatternSize);
			drawDot(dotPatternSize / 2, dotPatternSize / 2);
			return Promise.resolve();
		}, true);
		await rx.customTransform(
			(ctx) => {
				ctx.beginPath();
				roundedRectangle(
					ctx,
					x + textboxRoundingBuffer,
					y + textboxRoundingBuffer,
					this.width - textboxRoundingBuffer * 2,
					this.height - TBConstants.NameboxHeight - textboxRoundingBuffer * 2,
					textboxRounding
				);
				ctx.clip();
			},
			async (subRx) => {
				const h = this.obj.height;
				const w = this.obj.width;
				const gradient = subRx.linearGradient(x, y, x, y + h);
				const color = RGBAColor.fromHex(this.customColor);
				gradient.addColorStop(0, color.toCss());
				gradient.addColorStop(
					1,
					`rgba(${color.r},${color.g},${color.b},0.6667)`
				);
				subRx.drawRect({
					x,
					y,
					w,
					h,
					fill: {
						style: gradient,
					},
					outline: {
						style: '#ffdfee',
						width: 6,
					},
				});
				await subRx.customTransform(
					(ctx) => {
						ctx.translate(x, y);
					},
					(_subSubRx) => {
						const pattern = subRx.patternFrom(dotPattern);
						subRx.drawRect({
							x: 0,
							y: 0,
							w,
							h,
							fill: {
								style: pattern,
							},
							composition: 'source-atop',
						});
					}
				);
				const glowGradient = subRx.linearGradient(
					x,
					y + h - TBConstants.GlowRY,
					x,
					y + h
				);
				glowGradient.addColorStop(0, 'rgba(255,255,255,0.3137)');
				glowGradient.addColorStop(0.5, 'rgba(255,255,255,0.0627)');
				glowGradient.addColorStop(1, 'rgba(255,255,255,0)');
				subRx.drawPath({
					path: (ctx) => {
						ctx.ellipse(
							x + w / 2,
							y + h,
							TBConstants.GlowRX,
							TBConstants.GlowRY,
							0,
							0,
							2 * Math.PI
						);
					},
					fill: {
						style: glowGradient,
					},
				});
			}
		);
		const outlineColor = hslColor
			.shift(textboxOutlineColorDelta)
			.toRgb()
			.toCss();
		rx.drawPath({
			path: (path) => {
				roundedRectangle(
					path,
					x + textboxRoundingBuffer,
					y + textboxRoundingBuffer,
					this.width - textboxRoundingBuffer * 2,
					this.height - TBConstants.NameboxHeight - textboxRoundingBuffer * 2,
					textboxRounding
				);
			},
			outline: {
				style: outlineColor,
				width: textboxOutlineWidth,
			},
		});
		dotPattern.dispose();
	}

	public async render(rx: RenderContext): Promise<void> {
		const constants = getConstants();
		const w = this.width;
		const h = this.height;
		const w2 = w / 2;
		const baseX = this.obj.flip
			? constants.Base.screenWidth - this.obj.x
			: this.obj.x;
		const x = baseX - w2;
		const y = this.obj.y;

		if (this.obj.talkingObjId !== null) {
			await this.renderNamebox(rx, x + this.nameboxOffsetX, y);
		}

		await this.renderBackdrop(rx, x, y + this.nameboxHeight);

		const bottom = y + h;
		const controlsY = bottom - TBConstants.ControlsYBottomOffset;

		if (this.obj.controls) this.renderControls(rx, controlsY);

		if (this.obj.continue) {
			rx.drawImage({
				image: await getBuildInAsset('next'),
				x: x + w - TBConstants.ArrowXRightOffset,
				y: bottom - TBConstants.ArrowYBottomOffset,
			});
		}
	}
}
