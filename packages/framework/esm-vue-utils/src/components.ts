import {
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onErrorCaptured,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  type PropType,
} from 'vue';
import type { AssignedExtension, ExtensionData } from '@egen-civitas/esm-extensions';
import { mountExtension, reportComponentError, type ExtensionMount } from '@egen-civitas/esm-integration-utils';
import { COMPONENT_CONTEXT } from './keys.js';
import { useExtensionSlot } from './composables.js';

/** Équivalent de la frontière d'erreur de `egenComponentDecorator` (esm-react-utils). */
export const EgenErrorBoundary = defineComponent({
  name: 'EgenErrorBoundary',
  props: { throwErrorsToConsole: { type: Boolean, default: true } },
  setup(props, { slots }) {
    const failed = ref(false);
    onErrorCaptured((err, _instance, info) => {
      reportComponentError(err, { throwErrorsToConsole: props.throwErrorsToConsole }, { info });
      failed.value = true;
      return false; // l'erreur est traitée ici, elle ne remonte pas
    });
    return () => (failed.value ? h('div', 'An error has occurred. Please try reloading the page.') : slots.default?.());
  },
});

/**
 * Monte, dans un `<div>`, l'extension du contexte courant (ou celle donnée par la prop `extension`).
 * Équivalent du composant `Extension` de esm-react-utils.
 */
export const Extension = defineComponent({
  name: 'EgenExtension',
  props: {
    state: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    extension: { type: Object as PropType<ExtensionData>, default: undefined },
  },
  setup(props) {
    const ctx = inject(COMPONENT_CONTEXT, null);
    const node = shallowRef<HTMLElement | null>(null);
    let mounted: ExtensionMount | undefined;
    const target = () => props.extension ?? ctx?.extension;

    onMounted(() => {
      const ext = target();
      if (ext?.extensionSlotName && ext.extensionSlotModuleName && node.value) {
        mounted = mountExtension(node.value, ext, props.state);
      }
    });
    watch(
      () => props.state,
      (state) => {
        mounted?.update(state);
      },
    );
    onBeforeUnmount(() => mounted?.unmount());

    return () => {
      const ext = target();
      return ext
        ? h('div', { ref: node, 'data-extension-id': ext.extensionId, style: { position: 'relative' } })
        : null;
    };
  },
});

/** Fournit le contexte d'une extension à son contenu (pour que `<Extension />` fonctionne sans prop). */
const ExtensionItem = defineComponent({
  name: 'EgenExtensionItem',
  props: {
    slotName: { type: String, required: true },
    slotModuleName: { type: String, required: true },
    extensionId: { type: String, required: true },
  },
  setup(props, { slots }) {
    provide(COMPONENT_CONTEXT, {
      moduleName: props.slotModuleName, // non utilisé par l'extension réceptrice
      featureName: '', // idem
      extension: {
        extensionId: props.extensionId,
        extensionSlotName: props.slotName,
        extensionSlotModuleName: props.slotModuleName,
      },
    });
    return () => slots.default?.();
  },
});

/**
 * Emplacement où s'affichent les extensions rattachées au slot `name`.
 * Équivalent du composant `ExtensionSlot` de esm-react-utils :
 *   - par défaut, chaque extension est rendue par `<Extension>` ;
 *   - slot par défaut à portée `{ extension, state }` pour un rendu personnalisé ;
 *   - prop `select` pour filtrer/réordonner.
 */
export const ExtensionSlot = defineComponent({
  name: 'EgenExtensionSlot',
  props: {
    name: { type: String, required: true },
    select: { type: Function as PropType<(e: Array<AssignedExtension>) => Array<AssignedExtension>>, default: undefined },
    state: { type: Object as PropType<Record<string, unknown>>, default: undefined },
  },
  setup(props, { slots }) {
    if (slots.default && props.state) {
      throw new Error(
        'Both default slot and state have been provided. If a slot is provided, the state must be passed to the `Extension` component.',
      );
    }
    const stateRef = shallowRef(props.state);
    watch(() => props.state, (s) => (stateRef.value = s));
    const { extensions, extensionSlotName, extensionSlotModuleName } = useExtensionSlot(props.name, stateRef);

    return () => {
      const list = props.select ? props.select(extensions.value) : extensions.value;
      return h(
        'div',
        {
          'data-extension-slot-name': extensionSlotName,
          'data-extension-slot-module-name': extensionSlotModuleName,
          style: { position: 'relative' },
        },
        list.map((extension) =>
          h(
            ExtensionItem,
            { key: extension.id, slotName: extensionSlotName, slotModuleName: extensionSlotModuleName, extensionId: extension.id },
            {
              default: () =>
                slots.default ? slots.default({ extension, state: props.state }) : h(Extension, { state: props.state }),
            },
          ),
        ),
      );
    };
  },
});
