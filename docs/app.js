const page = document.documentElement;
const languageButtons = document.querySelectorAll("[data-language]");
const localizedLabels = document.querySelectorAll("[data-aria-zh][data-aria-en]");

const metadata = {
  zh: {
    htmlLang: "zh-CN",
    title: "Notivue｜本地优先的视频学习助手",
    description:
      "Notivue 是一个本地优先的视频学习助手，将字幕、AI 章节与时间戳笔记整理成可沉淀的学习资料.",
  },
  en: {
    htmlLang: "en",
    title: "Notivue | A local-first video learning companion",
    description:
      "Notivue is a local-first video learning companion that turns transcripts, AI chapters, and timestamped notes into knowledge you can keep.",
  },
};

function setLanguage(language, persist = true) {
  const nextLanguage = metadata[language] ? language : "zh";
  const copy = metadata[nextLanguage];

  page.dataset.lang = nextLanguage;
  page.lang = copy.htmlLang;
  document.title = copy.title;
  document.querySelector('meta[name="description"]').content = copy.description;

  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === nextLanguage));
  });

  localizedLabels.forEach((element) => {
    element.setAttribute("aria-label", element.dataset[`aria${nextLanguage === "zh" ? "Zh" : "En"}`]);
  });

  if (persist) {
    localStorage.setItem("notivue-site-language", nextLanguage);
  }
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});

const savedLanguage = localStorage.getItem("notivue-site-language");
const browserLanguage = navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
setLanguage(savedLanguage || browserLanguage, false);
