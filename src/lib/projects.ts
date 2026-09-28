/**
 * Client projects shown in the "Our work" section and known to Kaylev.
 * Only set `public: true` once the client has agreed to be shown, and only
 * set `url` once their site is live and they're happy to be linked.
 */
export type ProjectStatus = "beta" | "launched";

export type Project = {
  id: string;
  company: string;
  /** What the product is, in one line. */
  summary: string;
  /** What DigiSol does for it. */
  role: string;
  status: ProjectStatus;
  public: boolean;
  url?: string;
};

export const PROJECTS: Project[] = [
  {
    id: "campaign-builder",
    company: "Campaign Builder",
    summary:
      "An app that started as a political campaign tool and is growing into a full business application.",
    role: "Product ideas and code for the move from campaigns to business, with social media growth through DigiSol Hub planned next.",
    status: "beta",
    public: true,
  },
  {
    id: "dealfinder-auctions",
    company: "DealFinder Auctions",
    summary: "An online auction website.",
    role: "Website design and build, with live testing before the full launch.",
    status: "beta",
    public: false,
  },
];

export const PUBLIC_PROJECTS = PROJECTS.filter((project) => project.public);
