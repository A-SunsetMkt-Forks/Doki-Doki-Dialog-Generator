<!--
	Allows setting the position and size of an object.
	Some objects are allowed to move in steps, or move freely across the canvas.
	Some objects cannot be resized. These restrictions are automatically applied by this component.
-->
<template>
	<d-fieldset :title="'Position' + (allowSize ? '/Size' : '')">
		<table class="v-w100">
			<tbody>
				<tr>
					<td colspan="2">
						<toggle-box
							v-if="allowStepMove"
							v-model="freeMove"
							label="Move freely?"
						/>
					</td>
				</tr>
				<tr v-if="allowStepMove && !freeMove">
					<td colspan="2">
						<table class="v-w100 button-tbl">
							<tbody>
								<tr>
									<td class="arrow-col">
										<button
											@click="--pos"
											:disabled="isFirstPos"
										>
											&lt;
										</button>
									</td>
									<td>
										<select
											id="current_talking"
											class="v-w100"
											style="text-align: center"
											v-model.number="pos"
										>
											<option
												v-for="(
													val, key
												) of positionNames"
												:key="key"
												:value="key"
											>
												{{ val }}
											</option>
										</select>
									</td>
									<td class="arrow-col">
										<button
											@click="++pos"
											:disabled="isLastPos"
										>
											&gt;
										</button>
									</td>
								</tr>
							</tbody>
						</table>
					</td>
				</tr>
				<template v-else>
					<tr>
						<td class="v-w50">
							<label for="sprite_x">X:</label>
						</td>
						<td class="v-w50">
							<input
								id="sprite_x"
								class="w100"
								type="number"
								v-model.number="x"
								@keydown.stop
							/>
						</td>
					</tr>
					<tr>
						<td class="v-w50">
							<label for="sprite_y">Y:</label>
						</td>
						<td class="v-w50">
							<input
								class="w100"
								id="sprite_y"
								type="number"
								v-model.number="y"
								@keydown.stop
							/>
						</td>
					</tr>
				</template>
				<template v-if="allowSize">
					<tr>
						<td class="v-w50">
							<label for="sprite_w">Width:</label>
						</td>
						<td class="v-w50">
							<input
								id="sprite_w"
								min="0"
								type="number"
								v-model.number="width"
								@keydown.stop
							/>
						</td>
					</tr>
					<tr>
						<td class="v-w50">
							<label for="sprite_h">Height:</label>
						</td>
						<td class="v-w50">
							<input
								id="sprite_h"
								min="0"
								type="number"
								v-model.number="height"
								@keydown.stop
							/>
						</td>
					</tr>
				</template>
			</tbody>
		</table>
	</d-fieldset>
</template>

<script lang="ts" setup>
import DFieldset from '@/components/ui/d-fieldset.vue';
import ToggleBox from '@/components/ui/d-toggle.vue';
import getConstants from '@/constants';
import { transaction } from '@/plugins/vuex-history';
import { rendererLookup } from '@/renderables/textbox';
import { useStore } from '@/store';
import {
	closestCharacterSlot,
	type ICharacter,
	type ISetFreeMoveMutation,
} from '@/store/object-types/characters';
import type { IPoem } from '@/store/object-types/poem';
import type { ITextBox } from '@/store/object-types/textbox';
import type {
	IObject,
	ISetObjectPositionMutation,
	ISetPositionAction,
	ISetSpriteSizeMutation,
} from '@/store/objects';
import { computed } from 'vue';

const props = defineProps<{
	obj: IObject;
}>();

const store = useStore();
//#region Size
const height = computed({
	get(): number {
		const constants = getConstants().TextBox;
		return (
			props.obj.height - (easterEgg.value ? constants.NameboxHeight : 0)
		);
	},
	set(height: number) {
		const constants = getConstants().TextBox;
		transaction(() => {
			store.commit('panels/setSize', {
				id: props.obj.id,
				panelId: props.obj.panelId,
				height:
					height + (easterEgg.value ? constants.NameboxHeight : 0),
				width: props.obj.width,
			} as ISetSpriteSizeMutation);
		});
	},
});
const width = computed({
	get(): number {
		return props.obj.width;
	},
	set(width: number) {
		transaction(() => {
			store.commit('panels/setSize', {
				id: props.obj.id,
				panelId: props.obj.panelId,
				height: props.obj.height,
				width,
			} as ISetSpriteSizeMutation);
		});
	},
});
const allowSize = computed(() => {
	const obj = props.obj;
	if (obj.type === 'textBox') {
		const renderer = rendererLookup[(obj as ITextBox).style];
		return renderer.resizable;
	}
	const constants = getConstants().Poem;
	if (obj.type === 'poem') {
		const bg = constants.poemBackgrounds[(obj as IPoem).background];
		return bg.file.startsWith('internal:');
	}
	return false;
});

// Nothing to see here. Move along.
const easterEgg = computed(() => {
	return props.obj.type === 'textBox' && location.search.includes('alex');
});
//#endregion Size
//#region Step Position
const allowStepMove = computed(() => 'freeMove' in props.obj!);
const positionNames = computed(() => getConstants().Base.positions);
const isFirstPos = computed(() => pos.value === 0);
const isLastPos = computed(
	() => pos.value === getConstants().Base.positions.length - 1
);
const pos = computed({
	get(): number {
		return closestCharacterSlot(props.obj.x);
	},
	set(value: number) {
		transaction(async () => {
			await store.dispatch('panels/setPosition', {
				id: props.obj.id,
				panelId: props.obj.panelId,
				x: getConstants().Base.characterPositions[value],
				y: props.obj.y,
			} as ISetPositionAction);
		});
	},
});
//#endregion Step Position
//#region Position
const freeMove = computed({
	get(): boolean {
		return !!(props.obj as ICharacter).freeMove;
	},
	set(freeMove: boolean) {
		transaction(() => {
			store.commit('panels/setFreeMove', {
				id: props.obj.id,
				panelId: props.obj.panelId,
				freeMove,
			} as ISetFreeMoveMutation);
		});
	},
});
const x = computed({
	get(): number {
		return props.obj.x;
	},
	set(x: number) {
		transaction(() => {
			store.commit('panels/setPosition', {
				id: props.obj.id,
				panelId: props.obj.panelId,
				x,
				y: y.value,
			} as ISetObjectPositionMutation);
		});
	},
});
const y = computed({
	get(): number {
		return props.obj.y;
	},
	set(y: number) {
		transaction(() => {
			store.commit('panels/setPosition', {
				id: props.obj.id,
				panelId: props.obj.panelId,
				x: x.value,
				y,
			} as ISetObjectPositionMutation);
		});
	},
});
//#endregion Position
</script>

<style lang="scss" scoped>
fieldset {
	> table {
		width: 100%;

		> tr > td:nth-child(2) {
			width: 64px;
		}

		table {
			width: 100%;
			select {
				width: 100%;
			}
		}
	}
}

input {
	width: 80px;
}

.arrow-col {
	width: 24px;

	button {
		width: 24px;
	}
}
</style>
