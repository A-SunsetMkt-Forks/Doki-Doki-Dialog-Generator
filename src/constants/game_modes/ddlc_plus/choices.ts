import type { ITextStyle } from '@/renderer/text-renderer/text-renderer';
import { HSLAColor } from '@/util/colors/hsl';
import { screenHeight } from './base';

export const nameboxTextOutlineDelta = new HSLAColor(
	-0.03065134099616873,
	-0.5714285714285714,
	-0.29607843137254897,
	0
);

export const ChoiceButtonColor = '#ffe6f4';
export const ChoiceButtonBorderColor = '#ffbde1';
export const ChoiceButtonWidth = 630;
export const ChoiceSpacing = 33;
export const ChoiceX = 960;
export const ChoiceYOffset = 405;
export const ChoicePadding = 10.5;
export const Outline = 4.5;
export const ChoiceOuterPadding = Math.ceil(Outline / 2);

export const ChoiceY = (screenHeight - ChoiceYOffset) / 2;

export const ChoiceTextStyle: ITextStyle = {
	alpha: 1,
	color: 'black',
	fontName: 'aller',
	fontSize: 36,
	isBold: false,
	isItalic: false,
	isStrikethrough: false,
	isUnderlined: false,
	letterSpacing: 0,
	lineSpacing: 1,
	strokeColor: '',
	strokeWidth: 0,
};
