"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import GithubSlugger from "github-slugger";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { documentationRuntime, getDocumentationCopy, normaliseDocumentationHref } from "@/lib/i18n/documentation";
import styles from "./DocumentationViewer.module.css";

export interface DocumentationNavigationItem {
  label: string;
  href: string;
  path: string;
}

export interface DocumentationSidebarItem {
  type: "link" | "category";
  label: string;
  href?: string | null;
  path?: string | null;
  items?: DocumentationSidebarItem[];
  position?: number;
}

export interface DocumentationPageData {
  content: string;
  title: string;
  meta_title: string;
  meta_description: string;
  sidebar: DocumentationSidebarItem[];
  current_path: string;
  navigation: {
    prev: DocumentationNavigationItem | null;
    next: DocumentationNavigationItem | null;
  };
}

interface DocumentationViewerProps {
  initialPath: string;
}

interface ToCItem {
  id: string;
  text: string;
  level: 2 | 3;
}

function SidebarCategory({
  item,
  currentPath,
  onNavigate,
}: {
  item: DocumentationSidebarItem;
  currentPath: string;
  onNavigate: () => void;
}) {
  const hasActiveChild = useMemo(() => {
    const includesPath = (items: DocumentationSidebarItem[] = []): boolean =>
      items.some((candidate) => candidate.path === currentPath || includesPath(candidate.items));
    return includesPath(item.items);
  }, [currentPath, item.items]);
  const [isOpen, setIsOpen] = useState(item.path === currentPath || hasActiveChild);

  useEffect(() => {
    if (item.path === currentPath || hasActiveChild) setIsOpen(true);
  }, [currentPath, hasActiveChild, item.path]);

  return (
    <section className={styles.category}>
      <div className={`${styles.categoryHeader}${item.path === currentPath ? ` ${styles.active}` : ""}`}>
        {item.href ? (
          <Link className={styles.categoryLabel} href={item.href} onClick={onNavigate}>
            {item.label}
          </Link>
        ) : (
          <button className={styles.categoryLabel} type="button" onClick={() => setIsOpen((value) => !value)}>
            {item.label}
          </button>
        )}
        <button
          className={styles.categoryToggle}
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
        >
          <ChevronLeft className={isOpen ? styles.categoryChevronOpen : undefined} size={15} />
        </button>
      </div>
      {isOpen && (
        <div className={styles.categoryItems}>
          {item.items?.map((child) => (
            <SidebarItem key={`${child.type}-${child.path ?? child.label}`} item={child} currentPath={currentPath} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </section>
  );
}

function SidebarItem({
  item,
  currentPath,
  onNavigate,
}: {
  item: DocumentationSidebarItem;
  currentPath: string;
  onNavigate: () => void;
}) {
  if (item.type === "category") {
    return <SidebarCategory item={item} currentPath={currentPath} onNavigate={onNavigate} />;
  }

  return (
    <Link
      href={item.href ?? "/docs"}
      className={`${styles.sidebarLink}${item.path === currentPath ? ` ${styles.active}` : ""}`}
      onClick={onNavigate}
    >
      {item.label}
    </Link>
  );
}

function extractPageStructure(content: string): { title: string; toc: ToCItem[]; markdownBody: string } {
  const slugger = new GithubSlugger();
  const lines = content.split("\n");
  let title = "";
  let inFrontmatter = false;
  let passedFrontmatter = false;
  const toc: ToCItem[] = [];
  const body: string[] = [];

  lines.forEach((line, index) => {
    if (!passedFrontmatter) {
      if (index === 0 && line.trim() === "---") {
        inFrontmatter = true;
        return;
      }
      if (inFrontmatter && line.trim() === "---") {
        inFrontmatter = false;
        passedFrontmatter = true;
        return;
      }
      if (index === 0) passedFrontmatter = true;
    }

    if (inFrontmatter) {
      if (line.startsWith(documentationRuntime.frontmatterTitlePrefix)) title = line.replace(documentationRuntime.frontmatterTitlePrefix, "").trim().replace(/[\"']/g, "");
      return;
    }

    if (!title && line.startsWith("# ")) {
      title = line.slice(2).trim();
      return;
    }

    const heading = line.match(/^(#{2,3})\s+(.+)/);
    if (heading) {
      const text = heading[2].replace(/\{#.*\}/, "").trim();
      toc.push({ id: slugger.slug(text), text, level: heading[1].length as 2 | 3 });
    }
    body.push(line);
  });

  return { title, toc, markdownBody: body.join("\n") };
}

export default function DocumentationViewer({ initialPath }: DocumentationViewerProps) {
  const { locale } = useI18n();
  const copy = getDocumentationCopy(locale);
  const [page, setPage] = useState<DocumentationPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const loadPage = async () => {
    setLoading(true);
    setError(null);
    const endpoint = initialPath ? `v2/documentation/${initialPath.split("/").map(encodeURIComponent).join("/")}` : "v2/documentation";
    const response = await fetchAPI<DocumentationPageData>(endpoint);
    const documentationPage = response as unknown as DocumentationPageData;
    if (!response.success || !documentationPage.content) {
      setError(response.message ?? copy.failed);
      setLoading(false);
      return;
    }
    setPage(documentationPage);
    setLoading(false);
  };

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("accore-documentation-theme");
    setDarkMode(storedTheme === "dark");
  }, []);

  useEffect(() => {
    void loadPage();
    // Re-load when the statically exported route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPath]);

  useEffect(() => {
    window.localStorage.setItem("accore-documentation-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const structure = useMemo(() => (page ? extractPageStructure(page.content) : { title: "", toc: [], markdownBody: "" }), [page]);
  const renderSlugger = new GithubSlugger();
  const title = page?.title || structure.title || copy.documentation;

  useEffect(() => {
    const scrollToHash = () => {
      if (!window.location.hash) return;
      const element = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (!element) return;
      window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 96, behavior: "smooth" });
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, [page?.current_path, structure.markdownBody]);

  const toggleTheme = () => setDarkMode((value) => !value);
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 96, behavior: "smooth" });
    window.history.pushState(null, "", `#${id}`);
  };

  return (
    <div className={`${styles.root}${darkMode ? ` ${styles.dark}` : ""}`} dir={locale === "ar-SA" ? "rtl" : "ltr"}>
      {mobileMenuOpen && <button type="button" className={styles.mobileOverlay} aria-label={copy.closeMenu} onClick={closeMobileMenu} />}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brandCluster}>
            <button type="button" className={styles.mobileMenuButton} aria-label={copy.openMenu} onClick={() => setMobileMenuOpen((value) => !value)}>
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link href={documentationRuntime.basePath} className={styles.brand}>
              <BookOpen size={21} />
              <span>{copy.productName}</span>
              <span className={styles.brandDivider}>/</span>
              <span className={styles.brandSection}>{copy.documentation}</span>
            </Link>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.themeButton}
              onClick={toggleTheme}
              aria-label={darkMode ? copy.enableLightMode : copy.enableDarkMode}
              title={darkMode ? copy.lightMode : copy.darkMode}
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link href="/" className={styles.systemLink}>{copy.returnToSystem}<ChevronLeft size={15} /></Link>
          </div>
        </div>
      </header>

      <div className={styles.shell}>
        <aside className={`${styles.sidebar} ${styles.sidebarRight}${mobileMenuOpen ? ` ${styles.mobileOpen}` : ""}`}>
          <nav className={styles.sidebarInner} aria-label={copy.documentation}>
            {page?.sidebar.map((item) => <SidebarItem key={`${item.type}-${item.path ?? item.label}`} item={item} currentPath={page.current_path} onNavigate={closeMobileMenu} />)}
          </nav>
        </aside>

        <main className={styles.main}>
          {loading && <div className={styles.status}><div className={styles.spinner} /><p>{copy.loading}</p></div>}
          {!loading && error && <div className={styles.status}><FileText size={36} /><p>{error}</p><button type="button" className={styles.retryButton} onClick={() => void loadPage()}>{copy.retry}</button></div>}
          {!loading && page && (
            <article className={styles.article}>
              <nav className={styles.breadcrumbs} aria-label={copy.documentation}>
                <Link href="/docs" className={styles.homeLink}><Home size={16} /><span className={styles.visuallyHidden}>{copy.documentationHome}</span></Link>
                <ChevronLeft size={14} />
                <span>{title}</span>
              </nav>
              <h1>{title}</h1>
              <div className={styles.markdown}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h2: ({ children, ...props }) => {
                      const text = String(children);
                      return <h2 id={renderSlugger.slug(text)} {...props}>{children}</h2>;
                    },
                    h3: ({ children, ...props }) => {
                      const text = String(children);
                      return <h3 id={renderSlugger.slug(text)} {...props}>{children}</h3>;
                    },
                    table: ({ children, ...props }) => <div className={styles.tableWrapper}><table {...props}>{children}</table></div>,
                    code: ({ className, children, ...props }) => {
                      const language = /language-(\w+)/.exec(className ?? "")?.[1];
                      return language ? (
                        <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{ borderRadius: "0.75rem", margin: "1.5rem 0", direction: "ltr" }}>
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : <code className={className} {...props}>{children}</code>;
                    },
                    a: ({ href, children, ...props }) => {
                      if (!href) return <a {...props}>{children}</a>;
                      if (/^https?:\/\//i.test(href)) return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                      if (href.startsWith("#")) return <a href={href} {...props}>{children}</a>;
                      return <Link href={normaliseDocumentationHref(href)} {...props}>{children}</Link>;
                    },
                  }}
                >
                  {structure.markdownBody}
                </ReactMarkdown>
              </div>
              <footer className={styles.pagination}>
                {page.navigation.prev ? <Link className={styles.paginationLink} href={page.navigation.prev.href}><span><ChevronRight size={19} />{copy.previous}</span><strong>{page.navigation.prev.label}</strong></Link> : <span />}
                {page.navigation.next ? <Link className={`${styles.paginationLink} ${styles.paginationNext}`} href={page.navigation.next.href}><span>{copy.next}<ChevronLeft size={19} /></span><strong>{page.navigation.next.label}</strong></Link> : <span />}
              </footer>
            </article>
          )}
        </main>

        <aside className={`${styles.sidebar} ${styles.sidebarLeft}`}>
          <div className={styles.toc}>
            <h2>{copy.thisPage}</h2>
            {structure.toc.length > 0 ? <ul>{structure.toc.map((item) => <li className={item.level === 3 ? styles.tocNested : undefined} key={item.id}><button type="button" onClick={() => scrollToSection(item.id)}>{item.text}</button></li>)}</ul> : <p>{copy.noHeadings}</p>}
          </div>
        </aside>
      </div>

      <footer className={styles.footer}><span>{copy.renderedBy}</span><span>© {new Date().getFullYear()} {copy.productName}</span></footer>
    </div>
  );
}
