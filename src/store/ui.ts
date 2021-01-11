import { Module } from 'vuex';
import { IRootState } from '.';

export interface IUiState {
	vertical: boolean;
	nsfw: boolean;
	selection: string | null;
	lqRendering: boolean;
	lastDownload: string | null;
	clipboard: string | null;
	useDarkTheme: boolean | null;
	defaultCharacterTalkingZoom: boolean;
}

export default {
	namespaced: true,
	state: {
		vertical: false,
		lqRendering: true,
		nsfw: false,
		selection: null,
		lastDownload: null,
		clipboard: null,
		useDarkTheme: null,
		defaultCharacterTalkingZoom: true,
	},
	mutations: {
		setVertical(state, vertical: boolean) {
			state.vertical = vertical;
		},
		setNsfw(state, nsfw: boolean) {
			state.nsfw = nsfw;
		},
		setLqRendering(state, lqRendering: boolean) {
			state.lqRendering = lqRendering;
		},
		setSelection(state, selection: string | null) {
			state.selection = selection;
		},
		setLastDownload(state, download: string) {
			state.lastDownload = download;
		},
		setClipboard(state, contents: string) {
			state.clipboard = contents;
		},
		setDarkTheme(state, theme: boolean | null) {
			state.useDarkTheme = theme;
		},
		setDefaultCharacterTalkingZoom(state, zoom: boolean) {
			state.defaultCharacterTalkingZoom = zoom;
		},
	},
} as Module<IUiState, IRootState>;
