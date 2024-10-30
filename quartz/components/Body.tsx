// @ts-ignore
import clipboardScript from "./scripts/clipboard.inline"
import clipboardStyle from "./styles/clipboard.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Body: QuartzComponent = ({ children }: QuartzComponentProps) => {
  return (
    <>
      <div id="quartz-body">{children}</div>
      <script
        src="https://giscus.app/client.js"
        data-repo="thanhtschoepe/obsidian-publish"
        data-repo-id="R_kgDOND35Vg"
        data-category="Announcements"
        data-category-id="DIC_kwDOND35Vs4Cj1S_"
        data-mapping="pathname"
        data-strict="0"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="top"
        data-theme="dark_tritanopia"
        data-lang="en"
        data-loading="lazy"
        crossorigin="anonymous"
        async
      ></script>
    </>
  )
}

Body.afterDOMLoaded = clipboardScript
Body.css = clipboardStyle

export default (() => Body) satisfies QuartzComponentConstructor
