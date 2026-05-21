import MarketingIndex from "@/marketing/pages/Index";
import { ThemeProvider } from "@/marketing/components/ThemeProvider";

const Marketing = () => (
  <ThemeProvider>
    <div className="marketing-theme">
      <MarketingIndex />
    </div>
  </ThemeProvider>
);

export default Marketing;
