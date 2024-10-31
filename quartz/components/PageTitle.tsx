import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <h2 class={classNames(displayClass, "page-title")}>
      <div class="blob-container">
        <div class="blob-cont">
          <div class="yellow blob"></div>
          <div class="red blob"></div>
          <div class="green blob"></div>
        </div>
      </div>
      <div class="title-logo">
        <img src={"static/meowbark.webp"} alt="" />
        <a href={baseDir} class={displayClass}>
          {title}
        </a>
      </div>
    </h2>
  )
}

PageTitle.css = `
.page-title {
  font-size: 1.75rem;
  margin: 0;
}
.title-logo {
  display: flex;
  align-items: center;
  gap: 1rem;
}
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
