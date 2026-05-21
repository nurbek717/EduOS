import { ChevronDown, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES } from "@/marketing/i18n";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  variant?: "ghost" | "outline";
  className?: string;
}

export const LanguageSwitcher = ({ variant = "ghost", className }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation("marketing");
  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ??
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ??
    SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={cn(
            "gap-2 rounded-full bg-background/80 px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-background/80 hover:text-foreground",
            className,
          )}
        >
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span>{current.short}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[120px] rounded-2xl bg-background/95 p-2"
      >
        {SUPPORTED_LANGUAGES.map((lang) => {
          const active = current.code === lang.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={cn(
                "cursor-pointer rounded-xl px-4 py-2 text-center text-sm font-semibold tracking-wide text-muted-foreground",
                "data-[highlighted]:bg-sky-100 data-[highlighted]:text-sky-700",
              )}
            >
              <span className="w-full">{lang.short}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
