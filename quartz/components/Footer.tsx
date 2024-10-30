import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/footer.scss"
import { version } from "../../package.json"
import { i18n } from "../i18n"

interface Options {
  links: Record<string, string>
}

export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ displayClass, cfg }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    const links = opts?.links ?? []
    return (
      <>
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
          data-theme="preferred_color_scheme"
          data-lang="en"
          data-loading="lazy"
          crossorigin="anonymous"
          async
        ></script>
        <footer class={`${displayClass ?? ""}`}>
          <p>
            {i18n(cfg.locale).components.footer.createdWith} ❤️ & ☕️ {year}
          </p>
          <ul>
            {Object.entries(links).map(([text, link]) => (
              <li>
                <a href={link}>{text}</a>
              </li>
            ))}
          </ul>
        </footer>
      </>
    )
  }

  Footer.css = style
  return Footer
}) satisfies QuartzComponentConstructor
