import type { ITextStyle } from '@/renderer/text-renderer/text-renderer';
import { BaseTextStyle } from './text-box';
import { nameboxStrokeDefaultColor } from './text-box-custom';

export const NotificationBackgroundColor = '#ffe6f4';
export const NotificationBorderColor = '#ffbde1';
export const NotificationBackdropColor = 'rgba(255,255,255,0.6)';
// export const NotificationMaxWidth = 744;
export const NotificationPadding = 60;
export const NotificationSpacing = 45;

export const NotificationOkTextStyle: ITextStyle = {
	...BaseTextStyle,
	fontName: 'riffic',
	fontSize: 36,
	strokeColor: nameboxStrokeDefaultColor,
	strokeWidth: 12,
	letterSpacing: 1,
	color: 'white',
};

export const NotificationTextStyle: ITextStyle = {
	alpha: 1,
	color: 'black',
	fontName: 'aller',
	fontSize: 36,
	isBold: false,
	isItalic: false,
	isStrikethrough: false,
	isUnderlined: false,
	letterSpacing: 0,
	lineSpacing: 1.2,
	strokeColor: '',
	strokeWidth: 0,
};
