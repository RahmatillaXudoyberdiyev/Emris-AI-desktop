import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "../i18n/LanguageContext";
import { desktopApi } from "../services/api";

export default function Header({
  currentProject,
  currentSessionTitle,
  projects = [],
  onSelectProject,
  onOpenFolderModal
}) {
  const { language, setLanguage, t } = useTranslation();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [quota, setQuota] = useState(null);
  const langRef = useRef(null);
  const projectRef = useRef(null);

  useEffect(() => {
    desktopApi.getQuota().then((data) => {
      if (data && data.remaining !== undefined) {
        setQuota(data);
      }
    }).catch((err) => console.error("[Header] Quota error:", err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      try {
        if (langRef.current && !langRef.current.contains(e.target)) {
          setIsLangOpen(false);
        }
        if (projectRef.current && !projectRef.current.contains(e.target)) {
          setIsProjectOpen(false);
        }
      } catch (err) {
        console.error("[Header] Click outside error:", err);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages = [
    {
      code: "uz",
      label: "O'zbek",
      flag: (
        <svg className="w-4 h-3 rounded-xs flex-shrink-0" viewBox="0 0 1000 500">
          <defs>
            <g id="uz_flag_s1">
              <polygon points="0,-12 3.5,-3.7 11.4,-3.7 5,1 7.4,8.5 0,3.7 -7.4,8.5 -5,1 -11.4,-3.7 -3.5,-3.7" fill="#ffffff" />
            </g>
          </defs>
          <rect width="1000" height="500" fill="#1eb53a" />
          <rect width="1000" height="340" fill="#ce1126" />
          <rect width="1000" height="330" fill="#ffffff" />
          <rect width="1000" height="170" fill="#ce1126" />
          <rect width="1000" height="160" fill="#0099b5" />
          <circle cx="140" cy="80" r="60" fill="#ffffff" />
          <circle cx="160" cy="80" r="60" fill="#0099b5" />
          <use href="#uz_flag_s1" x="272" y="32" />
          <use href="#uz_flag_s1" x="320" y="32" />
          <use href="#uz_flag_s1" x="368" y="32" />
          <use href="#uz_flag_s1" x="224" y="80" />
          <use href="#uz_flag_s1" x="272" y="80" />
          <use href="#uz_flag_s1" x="320" y="80" />
          <use href="#uz_flag_s1" x="368" y="80" />
          <use href="#uz_flag_s1" x="176" y="128" />
          <use href="#uz_flag_s1" x="224" y="128" />
          <use href="#uz_flag_s1" x="272" y="128" />
          <use href="#uz_flag_s1" x="320" y="128" />
          <use href="#uz_flag_s1" x="368" y="128" />
        </svg>
      )
    },
    {
      code: "en",
      label: "English",
      flag: (
        <svg className="w-4 h-3 rounded-xs flex-shrink-0" viewBox="0 0 60 30">
          <clipPath id="s_uk_menu"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
          <clipPath id="t_uk_menu"><path d="M0,0 L60,30 M60,0 L0,30" /></clipPath>
          <g clipPath="url(#s_uk_menu)">
            <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
            <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t_uk_menu)" stroke="#C8102E" strokeWidth="4" />
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
          </g>
        </svg>
      )
    },
    {
      code: "ru",
      label: "Русский",
      flag: (
        <svg className="w-4 h-3 rounded-xs flex-shrink-0" viewBox="0 0 900 600">
          <rect width="900" height="600" fill="#fff" />
          <rect width="900" height="400" y="200" fill="#0039a6" />
          <rect width="900" height="200" y="400" fill="#d52b1e" />
        </svg>
      )
    }
  ];

  const currentFlag = languages.find((l) => l.code === language)?.flag || languages[0].flag;

  const handleSelectLanguage = (code) => {
    try {
      setLanguage(code);
      setIsLangOpen(false);
    } catch (error) {
      console.error("[Header] Error setting language:", error);
    }
  };

  return (
    <header className="h-14 border-b border-[#26262a] bg-[#151515] px-5 flex items-center justify-between flex-shrink-0 z-30 select-none">
      <div className="flex items-center gap-3">
        <div ref={projectRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProjectOpen(!isProjectOpen)}
            className="text-xs text-[#F9F9FA] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-folder text-[#94a3b8]"></i>
            <span className="font-medium">{currentProject && currentProject !== "No Project" ? currentProject : t("workspace.no_project")}</span>
            <i className="fa-solid fa-chevron-down text-[8px] text-[#64748b] ml-0.5"></i>
          </button>

          {isProjectOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-56 bg-[#1c1c1f] border border-[#2e2e32] rounded-2xl shadow-2xl p-1.5 z-50 text-xs text-[#F9F9FA] space-y-0.5">
              <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (onSelectProject) onSelectProject("No Project");
                      setIsProjectOpen(false);
                    } catch (err) {
                      console.error("[Header] Select no project error:", err);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    currentProject === "No Project" ? "bg-[#28282c] text-[#F9F9FA] font-medium" : "hover:bg-[#222226] text-[#D1D1D6]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <i className="fa-regular fa-circle-xmark text-[#94a3b8] text-xs"></i>
                    <span>{t("workspace.no_project")}</span>
                  </div>
                  {currentProject === "No Project" && <i className="fa-solid fa-check text-[#60a5fa] text-[10px]"></i>}
                </button>

                {projects.map((p) => {
                  const isSelected = currentProject === p.name;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        try {
                          if (onSelectProject) onSelectProject(p.name);
                          setIsProjectOpen(false);
                        } catch (err) {
                          console.error("[Header] Select project error:", err);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected ? "bg-[#28282c] text-[#F9F9FA] font-medium" : "hover:bg-[#222226] text-[#D1D1D6]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <i className="fa-solid fa-folder text-[#94a3b8] text-xs flex-shrink-0"></i>
                        <span className="truncate">{p.name}</span>
                      </div>
                      {isSelected && <i className="fa-solid fa-check text-[#60a5fa] text-[10px]"></i>}
                    </button>
                  );
                })}
              </div>

              {onOpenFolderModal && (
                <div className="border-t border-[#26262a] pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        setIsProjectOpen(false);
                        onOpenFolderModal();
                      } catch (err) {
                        console.error("[Header] Open modal error:", err);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#F9F9FA] hover:bg-[#28282c] transition-colors text-left cursor-pointer font-medium"
                  >
                    <i className="fa-solid fa-plus text-[#60a5fa] text-xs"></i>
                    <span>{t("workspace.new_project")}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <span className="text-[#64748b]">/</span>

        <span className="text-xs font-medium text-[#D1D1D6]">
          {currentSessionTitle || t("header.untitled")}
        </span>

        <button
          type="button"
          className="text-[#64748b] hover:text-[#F9F9FA] text-xs p-1 cursor-pointer transition-colors"
          title="Rename Session"
        >
          <i className="fa-solid fa-pen text-[10px]"></i>
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <div ref={langRef} className="relative">
          <button
            type="button"
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex items-center gap-2 bg-[#1c1c1f] hover:bg-[#222226] border border-[#2e2e32] rounded-xl px-2.5 py-1.5 text-xs text-[#F9F9FA] transition-colors cursor-pointer shadow-sm"
          >
            <span className="flex items-center">{currentFlag}</span>
            <i className="fa-solid fa-chevron-down text-[8px] text-[#94a3b8]"></i>
          </button>

          {isLangOpen && (
            <div className="absolute right-0 mt-1.5 w-36 bg-[#1c1c1f] border border-[#2e2e32] rounded-2xl shadow-2xl py-1 z-50 text-xs text-[#F9F9FA] space-y-0.5">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                    language === lang.code
                      ? "bg-[#28282c] text-[#F9F9FA] font-medium"
                      : "hover:bg-[#222226] text-[#D1D1D6] hover:text-[#F9F9FA]"
                  }`}
                >
                  {lang.flag}
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {quota && quota.remaining !== undefined && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e1e22] border border-[#2e2e32] text-xs"
            title="Bugungi bepul so'rovlar limiti"
          >
            <i className="fa-solid fa-bolt text-[#60a5fa] text-[10px]"></i>
            <span className="text-[#F9F9FA] font-medium">{quota.remaining}</span>
            <span className="text-[#64748b]">/ {quota.limit || 50}</span>
          </div>
        )}

        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e1e22] hover:bg-[#28282c] border border-[#2e2e32] text-[#D1D1D6] hover:text-[#F9F9FA] text-xs transition-colors cursor-pointer"
        >
          <i className="fa-solid fa-key text-[#94a3b8] text-xs"></i>
          <span>{t("header.api_keys")}</span>
        </button>
      </div>
    </header>
  );
}
