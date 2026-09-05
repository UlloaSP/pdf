export interface Field {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "checkbox" | "password" | "textarea";
  default?: string | number | boolean;
  options?: string[];
}
export interface Feature {
  id: string;
  name: string;
  description: string;
  category: string;
  extensions: string[];
  multiple: boolean;
  fields: Field[];
  requirements: string[];
}
const modules = import.meta.glob<Feature>("./features/*.json", {
  eager: true,
  import: "default",
});
export const features = Object.values(modules).sort((a, b) =>
  a.name.localeCompare(b.name, "es"),
);
