<template>
    <h4>
        {{labelKey}}:<br />
    </h4>
    <h3 class="item-name">
        {{value}}
    </h3>
</template>

<script lang="ts" setup>
import { computed, MaybeRef, toValue } from 'vue';

const props = defineProps<{
    labelKey: MaybeRef<string>;
    value: MaybeRef<string>;
}>();
const labelKey = computed(() => game.i18n.localize(toValue(props.labelKey)));
const value = computed(() => props.value);
</script>