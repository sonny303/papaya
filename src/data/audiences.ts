export const audiences = [
  {
    name: "For patients",
    icon: "heart",
    tone: "peach",
    accentClassName: "bg-coral",
    iconClassName: "bg-peach text-action",
    headline: "Prepare with more clarity",
    description:
      "Keep questions, preparation steps, appointments, and trusted resources organized in one place you control.",
    linkLabel: "Learn more for patients",
    href: "/who-we-serve#patients",
  },
  {
    name: "For partners",
    icon: "partners",
    tone: "butter",
    accentClassName: "bg-papaya",
    iconClassName: "bg-butter text-warning",
    headline: "Stay informed, together",
    description:
      "Create shared context around what matters, what comes next, and how you can prepare side by side.",
    linkLabel: "Learn more for partners",
    href: "/who-we-serve#partners",
  },
  {
    name: "For clinics",
    icon: "clinic",
    tone: "leaf",
    accentClassName: "bg-leaf",
    iconClassName: "bg-leaf-soft text-leaf",
    headline: "Extend trusted guidance",
    description:
      "Give families clearer educational material, useful preparation steps, and trusted resources between visits.",
    linkLabel: "Learn more for clinics",
    href: "/who-we-serve#clinics",
  },
] as const;
