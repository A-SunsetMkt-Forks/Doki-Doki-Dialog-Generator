/**
 * This is a part of render-view that draws helpers on the screen to scale and rotate the currently selected object.
 */

import { getAssetByUrl } from '@/asset-manager';
import scale from '@/assets/open_in_full.svg';
import rotate from '@/assets/rotate_left.svg';
import getConstants from '@/constants';
import { IAsset } from '@/render-utils/assets/asset';
import { getMainSceneRenderer } from '@/renderables/main-scene-renderer';
import { RStore } from '@/store';
import { IObject, ISetSpriteRotationMutation } from '@/store/objects';
import { safeAsync } from '@/util/errors';
import { between, mod } from '@/util/math';

const pixelRatio = window.devicePixelRatio ?? 1;

export function paint(ctx: CanvasRenderingContext2D, center: DOMPointReadOnly) {
	const offsetCenter = movePointIntoView(center);

	ctx.save();
	if (dragData) {
		paintDashedLine(center, dragData.lastPos);
		dragData.grabby.paint(ctx, center, dragData);

		ctx.translate(dragData.lastPos.x, dragData.lastPos.y);
		ctx.scale(pixelRatio, pixelRatio);
		drawGrabby(ctx, dragData.grabby, new DOMPointReadOnly());
	} else {
		const constants = getConstants();
		ctx.translate(offsetCenter.x, offsetCenter.y);
		ctx.scale(pixelRatio, pixelRatio);
		if (center.x > constants.Base.screenWidth / 2) {
			ctx.scale(-1, 1);
		}
		if (center.y > constants.Base.screenHeight / 2) {
			ctx.scale(1, -1);
		}
		for (let i = 0; i < grabbies.length; i++) {
			const grabby = grabbies[i];
			if (!grabby.pos) {
				grabby.pos = getRadialPos(rotationOneSixth * (i + 1));
			}
			drawGrabby(ctx, grabby, grabby.pos!);
		}
	}
	ctx.restore();

	function paintDashedLine(start: DOMPointReadOnly, end: DOMPointReadOnly) {
		ctx.save();
		try {
			ctx.beginPath();
			ctx.moveTo(start.x, start.y);
			ctx.lineTo(end.x, end.y);
			ctx.setLineDash([5 * pixelRatio, 5 * pixelRatio]);
			ctx.strokeStyle = '#000';
			ctx.stroke();
			ctx.closePath();
		} finally {
			ctx.restore();
		}
	}
}

let initialDragAngle: number = 0;
let initalObjRotation: number = 0;
const tau = 2 * Math.PI;

const grabbies: Grabby[] = [
	{
		icon: rotate,
		paint(
			ctx: CanvasRenderingContext2D,
			center: DOMPointReadOnly,
			{ lastPos }: IRotationDragData
		) {
			const { angle, distance } = vectorToAngleAndDistance(
				pointsToVector(center, lastPos!)
			);
			const constants = getConstants().Base;
			let normAngle = mod(initialDragAngle - angle, tau);

			ctx.beginPath();
			ctx.moveTo(center.x, center.y);
			let start = initialDragAngle - Math.PI;
			let end = start + angle - initialDragAngle;

			// Flipping start and end if the rotation is less than half a circle
			if (normAngle <= Math.PI) {
				const tmp = end;
				end = start;
				start = tmp;
			}

			ctx.arc(center.x, center.y, constants.wheelInnerRadius, start, end);
			ctx.lineTo(center.x, center.y);
			ctx.globalCompositeOperation = 'difference';
			ctx.fillStyle = 'rgba(255, 255, 255, 1)';
			ctx.fill();
			ctx.globalCompositeOperation = 'source-over';
		},
		onStartMove(
			store: RStore,
			obj: IObject,
			center: DOMPointReadOnly,
			{ lastPos }: IRotationDragData
		) {
			initalObjRotation = obj.rotation;
			const { angle, distance } = vectorToAngleAndDistance(
				pointsToVector(center, lastPos!)
			);
			initialDragAngle = angle;
		},
		onMove(
			store: RStore,
			obj: IObject,
			center: DOMPointReadOnly,
			shift: boolean
		) {
			const { angle, distance } = vectorToAngleAndDistance(
				pointsToVector(center, dragData!.lastPos)
			);

			let rotation = mod(
				initalObjRotation + ((angle - initialDragAngle) / Math.PI) * 180,
				360
			);

			if (shift) {
				rotation = Math.round(rotation / 22.5) * 22.5;
			}

			if (obj.rotation === rotation) return;
			store.commit('panels/setRotation', {
				panelId: obj.panelId,
				id: obj.id,
				rotation,
			} as ISetSpriteRotationMutation);
		},
	},
	{
		icon: scale,
		paint(ctx: CanvasRenderingContext2D, center: DOMPointReadOnly) {},
		onStartMove(store: RStore, obj: IObject, center: DOMPointReadOnly) {},
		onMove(store: RStore, obj: IObject) {},
	},
];

let dragData: IDragData | null = null;

export function onDown(pos: DOMPointReadOnly) {
	const constants = getConstants();
	const grabbyHit = grabbies.find((grabby) => {
		const grabbyPos = grabby.lastDrawPos;
		if (!grabbyPos) return false;
		const distance = Math.sqrt(
			Math.pow(pos.x - grabbyPos.x, 2) + Math.pow(pos.y - grabbyPos.y, 2)
		);
		return distance <= (constants.Base.wheelWidth / 2) * pixelRatio;
	});
	if (grabbyHit) {
		dragData = {
			lastPos: pos,
			started: false,
			grabby: grabbyHit,
		};
		return true;
	}
	return false;
}

export function onMove(store: RStore, pos: DOMPointReadOnly, shift: boolean) {
	if (!dragData) return false;
	const panels = store.state.panels;
	const currentPanel = panels.panels[panels.currentPanel];
	const obj = currentPanel.objects[store.state.ui.selection!];
	const linkedTransform =
		getMainSceneRenderer(store)?.getLastRenderObject(obj.linkedTo!)
			?.preparedTransform ?? new DOMMatrixReadOnly();
	const center = linkedTransform.transformPoint(
		new DOMPointReadOnly(obj.x, obj.y)
	);
	if (!dragData.started) {
		dragData.started = true;
		dragData.grabby.onStartMove(store, obj, center, dragData);
	}
	dragData.lastPos = pos;
	dragData.grabby.onMove(store, obj, center, shift, dragData);
	return true;
}

export function onDrop() {
	if (!dragData) return false;
	dragData = null;
	return true;
}

const grabbyIcons = new Map<string, IAsset>();
for (const grabby of grabbies) {
	safeAsync(
		'Loading grabby icon',
		(async (grabby: Grabby) => {
			grabbyIcons.set(grabby.icon, await getAssetByUrl(grabby.icon));
		}).bind(this, grabby)
	);
}

function drawGrabby(
	ctx: CanvasRenderingContext2D,
	grabby: Grabby,
	pos: DOMPointReadOnly
) {
	const constants = getConstants();
	ctx.save();
	ctx.translate(pos.x, pos.y);
	grabby.lastDrawPos = ctx
		.getTransform()
		.transformPoint(new DOMPointReadOnly());
	ctx.scale(-1, 1);
	ctx.beginPath();
	ctx.ellipse(
		0,
		0,
		constants.Base.wheelWidth / 2,
		constants.Base.wheelWidth / 2,
		0,
		0,
		tau
	);
	ctx.closePath();
	const style = getComputedStyle(document.body);
	ctx.fillStyle = style.getPropertyValue('--accent-background');
	ctx.strokeStyle = style.getPropertyValue('--border');
	ctx.lineWidth = 2;
	ctx.fill();
	ctx.stroke();

	grabbyIcons.get(grabby.icon)?.paintOnto(ctx);
	ctx.restore();
}

interface Grabby {
	icon: string;
	onStartMove: (
		store: RStore,
		obj: IObject,
		center: DOMPointReadOnly,
		dragData: IDragData
	) => void;
	onMove: (
		store: RStore,
		obj: IObject,
		center: DOMPointReadOnly,
		shift: boolean,
		dragData: IDragData
	) => void;
	paint: (
		ctx: CanvasRenderingContext2D,
		center: DOMPointReadOnly,
		dragData: IDragData
	) => void;
	pos?: DOMPointReadOnly;
	lastDrawPos?: DOMPointReadOnly;
}

function movePointIntoView(center: DOMPointReadOnly): DOMPointReadOnly {
	const constants = getConstants();
	const fullRadius =
		constants.Base.wheelWidth + constants.Base.wheelInnerRadius * pixelRatio;
	return new DOMPointReadOnly(
		between(fullRadius, center.x, constants.Base.screenWidth - fullRadius),
		between(fullRadius, center.y, constants.Base.screenHeight - fullRadius)
	);
}

const rotationOneSixth = Math.PI / 6;
function getRadialPos(angle: number): DOMPointReadOnly {
	const constants = getConstants().Base;
	return new DOMPointReadOnly(
		constants.wheelInnerRadius * Math.cos(angle),
		constants.wheelInnerRadius * Math.sin(angle)
	);
}

function pointsToVector(
	a: DOMPointReadOnly,
	b: DOMPointReadOnly
): DOMPointReadOnly {
	return new DOMPointReadOnly(a.x - b.x, a.y - b.y);
}

function vectorToAngleAndDistance(v: DOMPointReadOnly): {
	angle: number;
	distance: number;
} {
	const angle = Math.atan2(v.y, v.x);
	return {
		angle: mod(angle, tau),
		distance: Math.sqrt(v.x * v.x + v.y * v.y),
	};
}

interface IDragData {
	lastPos: DOMPointReadOnly;
	started: boolean;
	grabby: Grabby;
}

interface IRotationDragData extends IDragData {}
