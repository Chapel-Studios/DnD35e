declare module '*.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '*.scss' {
  const styles: Record<string, string>;
  export default styles;
}

declare module '*.hbs?raw' {
  const source: string;
  export default source;
}
