declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

declare module '*.css' {}

/** 公开 API 的地址，见 rspack.config.ts 的 createConfig */
declare const __API_ORIGIN__: string

/** Electron 预加载脚本暴露的只读信息；在浏览器中不存在 */
interface Window {
  desktop?: {
    readonly platform: string
    readonly versions: {
      readonly electron: string
      readonly chrome: string
      readonly node: string
    }
  }
}

/** Prism 语言包通过副作用注册到全局 Prism */
declare module 'prismjs/components/*' {}

/** KaTeX 化学公式扩展通过副作用注册到 KaTeX */
declare module 'katex/contrib/mhchem' {}
