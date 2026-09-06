import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { cn } from "cn";
import {
  SlidersHorizontalIcon,
  PaletteIcon,
  KeyboardIcon,
  InfoIcon,
  XIcon,
  RotateCcwIcon,
  MonitorIcon,
  SunIcon,
  MoonIcon,
  FolderOpenIcon,
  FileTextIcon,
  CircleAlertIcon,
} from "lucide-react";
import type { AppSettings } from "./appSettings";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Slider as SliderControl } from "@/components/ui/slider";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

type Section = "general" | "appearance" | "shortcuts" | "about";
type ShortcutName = keyof AppSettings["shortcuts"];

export interface SettingsProps {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onReset: () => void;
  onClose: () => void;
  version: string;
  updater: {
    label: string;
    detail: string;
    canAct: boolean;
    action: () => Promise<void>;
    lastChecked: number | null;
    version?: string;
    progress?: number;
  };
}

const sections = [
  { id: "general", label: "General", icon: SlidersHorizontalIcon },
  { id: "appearance", label: "Apariencia", icon: PaletteIcon },
  { id: "shortcuts", label: "Atajos", icon: KeyboardIcon },
  { id: "about", label: "Acerca de", icon: InfoIcon },
] as const;
const palettes: { id: AppSettings["palette"]; name: string }[] = [
  { id: "graphite", name: "Grafito" },
  { id: "iris", name: "Iris" },
  { id: "ocean", name: "Océano" },
  { id: "ember", name: "Arcilla" },
  { id: "grove", name: "Bosque" },
];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <FieldSet>
      <FieldLegend>{title}</FieldLegend>
      <FieldGroup>{children}</FieldGroup>
    </FieldSet>
  );
}

function Row({
  title,
  detail,
  children,
  disabled,
}: {
  title: string;
  detail?: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Field orientation="responsive" data-disabled={disabled} className="min-w-0 gap-3">
      <FieldContent className="min-w-0">
        <FieldTitle>{title}</FieldTitle>
        {detail && <FieldDescription>{detail}</FieldDescription>}
      </FieldContent>
      <div className="min-w-0 shrink-0 @md/field-group:max-w-[55%]">{children}</div>
    </Field>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return <Switch aria-label={label} checked={checked} onCheckedChange={onChange} />;
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex w-full min-w-0 items-center gap-3 @md/field-group:w-48">
      <span id={id} className="sr-only">
        {label}
      </span>
      <SliderControl
        aria-labelledby={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => {
          if (next !== undefined) onChange(next);
        }}
      />
      <output
        aria-label={`${label}: ${value}${unit}`}
        className="min-w-12 text-right text-xs text-muted-foreground tabular-nums"
      >
        {value}
        {unit}
      </output>
    </div>
  );
}

export function Settings({
  settings,
  onChange,
  onReset,
  onClose,
  version,
  updater,
}: SettingsProps) {
  const [section, setSection] = useState<Section>("general");
  const [recording, setRecording] = useState<ShortcutName | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const activeSection = sections.find((item) => item.id === section)!;

  async function chooseFolder() {
    setError("");
    if (!isTauri()) {
      setError(
        "El selector de carpetas está disponible en la aplicación de Windows. Puedes escribir la ruta.",
      );
      return;
    }
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Carpeta de salida predeterminada",
      });
      if (typeof selected === "string") onChange({ defaultOutputDir: selected });
    } catch {
      setError("No se pudo abrir el selector de carpetas.");
    }
  }

  function captureShortcut(event: KeyboardEvent<HTMLButtonElement>, name: ShortcutName) {
    if (recording !== name) return;
    event.stopPropagation();
    if (event.key === "Tab") {
      setRecording(null);
      return;
    }
    event.preventDefault();
    if (event.key === "Escape") {
      setRecording(null);
      setError("");
      return;
    }
    if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) return;
    if (
      !(event.ctrlKey || event.altKey) ||
      event.metaKey ||
      event.key === "Unidentified" ||
      event.key === "Dead"
    ) {
      setError("Usa Ctrl o Alt junto a una letra, número o tecla de función. Escape cancela.");
      return;
    }
    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
    if (!/^[A-Z0-9,./;]$|^F(?:[1-9]|1[0-2])$/.test(key)) {
      setError("Elige una letra, un número o una tecla F1–F12 junto a Ctrl o Alt.");
      return;
    }
    const binding = [event.ctrlKey && "Ctrl", event.altKey && "Alt", event.shiftKey && "Shift", key]
      .filter(Boolean)
      .join("+");
    if (
      Object.entries(settings.shortcuts).some(
        ([other, value]) => other !== name && value.toLowerCase() === binding.toLowerCase(),
      )
    ) {
      setError("Ese atajo ya está asignado. Elige otra combinación.");
      return;
    }
    onChange({ shortcuts: { ...settings.shortcuts, [name]: binding } });
    setRecording(null);
    setError("");
  }

  async function update() {
    setChecking(true);
    setError("");
    try {
      await updater.action();
    } catch {
      setError("No se pudo completar la comprobación. Inténtalo de nuevo.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <section
      className="@container/settings flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background text-foreground"
      aria-label="Ajustes de la aplicación"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 p-4 @sm/settings:px-6">
        <h1 className="text-xl font-semibold tracking-tight">Ajustes</h1>
        <div className="flex items-center gap-1">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                <RotateCcwIcon data-icon="inline-start" />
                Restablecer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>¿Restablecer los ajustes?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todos los ajustes volverán a sus valores iniciales. Tus documentos se conservarán.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onReset();
                    setRecording(null);
                    setError("");
                  }}
                >
                  Restablecer ajustes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Cerrar ajustes"
            onClick={onClose}
          >
            <XIcon />
          </Button>
        </div>
      </header>
      <Separator />
      <Tabs
        value={section}
        onValueChange={(value) => {
          setSection(value as Section);
          setRecording(null);
          setError("");
        }}
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-0"
      >
        <nav aria-label="Secciones de ajustes" className="shrink-0 p-3 @sm/settings:px-6">
          <TabsList className="grid h-auto w-full grid-cols-2 @sm/settings:grid-cols-4">
            {sections.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id}>
                <Icon />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </nav>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 @sm/settings:px-6">
          {sections.map(({ id }) => (
            <TabsContent
              key={id}
              value={id}
              forceMount
              hidden={section !== id}
              className={cn(
                "mx-auto max-w-3xl flex-col gap-7 pt-3",
                section === id ? "flex" : "hidden",
              )}
            >
              {section === id && (
                <>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold tracking-tight">{activeSection.label}</h2>
                    <p className="text-sm text-muted-foreground">
                      {section === "general"
                        ? "Archivos, confirmaciones y comprobaciones automáticas."
                        : section === "appearance"
                          ? "Adapta el espacio de trabajo a tu forma de leer."
                          : section === "shortcuts"
                            ? "Configura las combinaciones de tus acciones habituales."
                            : "La versión instalada y sus actualizaciones."}
                    </p>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <CircleAlertIcon />
                      <AlertTitle>No se pudo aplicar el cambio</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {section === "general" && (
                    <>
                      <Group title="Archivos">
                        <Field>
                          <FieldLabel htmlFor="settings-output-dir">
                            Carpeta de salida predeterminada
                          </FieldLabel>
                          <FieldDescription>
                            Se propone al abrir una utilidad. Puedes cambiarla en cada trabajo.
                          </FieldDescription>
                          <InputGroup>
                            <InputGroupInput
                              id="settings-output-dir"
                              value={settings.defaultOutputDir}
                              placeholder="Seleccionar en cada trabajo"
                              onChange={(event) =>
                                onChange({ defaultOutputDir: event.target.value })
                              }
                            />
                            <InputGroupAddon align="inline-end">
                              <InputGroupButton
                                type="button"
                                size="icon-xs"
                                aria-label="Elegir carpeta de salida"
                                onClick={() => void chooseFolder()}
                              >
                                <FolderOpenIcon />
                              </InputGroupButton>
                            </InputGroupAddon>
                          </InputGroup>
                        </Field>
                        <Row
                          title="Recordar la última carpeta"
                          detail="Usarla como destino en el siguiente trabajo."
                        >
                          <Toggle
                            label="Recordar la última carpeta"
                            checked={settings.rememberOutputDir}
                            onChange={(rememberOutputDir) => onChange({ rememberOutputDir })}
                          />
                        </Row>
                      </Group>
                      <Separator />
                      <Group title="Confirmaciones">
                        <Row
                          title="Antes de cancelar un trabajo"
                          detail="Pedir confirmación si hay un documento en proceso."
                        >
                          <Toggle
                            label="Confirmar antes de cancelar un trabajo"
                            checked={settings.confirmCancel}
                            onChange={(confirmCancel) => onChange({ confirmCancel })}
                          />
                        </Row>
                        <Row
                          title="Antes de cerrar con un trabajo activo"
                          detail="Pedir confirmación para interrumpir el procesamiento."
                        >
                          <Toggle
                            label="Confirmar cierre con un trabajo activo"
                            checked={settings.confirmClose}
                            onChange={(confirmClose) => onChange({ confirmClose })}
                          />
                        </Row>
                      </Group>
                      <Separator />
                      <Group title="Actualizaciones">
                        <Row
                          title="Buscar actualizaciones automáticamente"
                          detail="Comprobar si hay una versión estable nueva."
                        >
                          <Toggle
                            label="Buscar actualizaciones automáticamente"
                            checked={settings.autoCheckUpdates}
                            onChange={(autoCheckUpdates) => onChange({ autoCheckUpdates })}
                          />
                        </Row>
                        <Row
                          title="Frecuencia de comprobación"
                          disabled={!settings.autoCheckUpdates}
                        >
                          <NativeSelect
                            aria-label="Frecuencia de comprobación"
                            className="w-full"
                            disabled={!settings.autoCheckUpdates}
                            value={settings.updateIntervalHours}
                            onChange={(event) =>
                              onChange({
                                updateIntervalHours: Number(event.target.value) as 1 | 6 | 24,
                              })
                            }
                          >
                            <NativeSelectOption value={1}>Cada hora</NativeSelectOption>
                            <NativeSelectOption value={6}>Cada 6 horas</NativeSelectOption>
                            <NativeSelectOption value={24}>Cada día</NativeSelectOption>
                          </NativeSelect>
                        </Row>
                      </Group>
                    </>
                  )}
                  {section === "appearance" && (
                    <>
                      <Group title="Tema y color">
                        <Field>
                          <FieldTitle id="settings-scheme-label">Tema de la aplicación</FieldTitle>
                          <ToggleGroup
                            type="single"
                            variant="outline"
                            value={settings.scheme}
                            onValueChange={(scheme) => {
                              if (scheme) onChange({ scheme: scheme as AppSettings["scheme"] });
                            }}
                            aria-labelledby="settings-scheme-label"
                            className="flex w-full flex-wrap"
                          >
                            {(
                              [
                                { id: "system", label: "Sistema", icon: MonitorIcon },
                                { id: "light", label: "Claro", icon: SunIcon },
                                { id: "dark", label: "Oscuro", icon: MoonIcon },
                              ] as const
                            ).map(({ id, label, icon: Icon }) => (
                              <ToggleGroupItem
                                key={id}
                                value={id}
                                className="min-h-16 min-w-20 flex-1 flex-col gap-2 py-3"
                              >
                                <Icon />
                                {label}
                              </ToggleGroupItem>
                            ))}
                          </ToggleGroup>
                        </Field>
                        <Field>
                          <FieldTitle id="settings-palette-label">Color de acento</FieldTitle>
                          <ToggleGroup
                            type="single"
                            variant="outline"
                            value={settings.palette}
                            onValueChange={(palette) => {
                              if (palette) onChange({ palette: palette as AppSettings["palette"] });
                            }}
                            aria-labelledby="settings-palette-label"
                            className="w-full flex-wrap"
                          >
                            {palettes.map(({ id, name }) => (
                              <ToggleGroupItem key={id} value={id} className="min-w-16 flex-1">
                                {name}
                              </ToggleGroupItem>
                            ))}
                          </ToggleGroup>
                          <FieldDescription>
                            El color elegido se aplica a los controles de toda la aplicación.
                          </FieldDescription>
                        </Field>
                      </Group>
                      <Separator />
                      <Group title="Superficies y movimiento">
                        <Row title="Contraste de bordes">
                          <Slider
                            label="Contraste de bordes"
                            value={settings.contrast}
                            min={100}
                            max={140}
                            unit="%"
                            onChange={(contrast) => onChange({ contrast })}
                          />
                        </Row>
                        <Row title="Opacidad de la sidebar">
                          <Slider
                            label="Opacidad de la sidebar"
                            value={settings.panelOpacity}
                            min={75}
                            max={100}
                            unit="%"
                            onChange={(panelOpacity) => onChange({ panelOpacity })}
                          />
                        </Row>
                        <Row
                          title="Duración de las animaciones"
                          detail="0 ms desactiva el movimiento."
                        >
                          <Slider
                            label="Duración de las animaciones"
                            value={settings.animationMs}
                            min={0}
                            max={400}
                            step={10}
                            unit=" ms"
                            onChange={(animationMs) => onChange({ animationMs })}
                          />
                        </Row>
                      </Group>
                      <Separator />
                      <Group title="Tipografía">
                        <Row title="Fuente de la interfaz">
                          <NativeSelect
                            className="w-full"
                            aria-label="Fuente de la interfaz"
                            value={settings.fontFamily}
                            onChange={(event) =>
                              onChange({
                                fontFamily: event.target.value as AppSettings["fontFamily"],
                              })
                            }
                          >
                            {["Segoe UI", "Calibri", "Georgia"].map((font) => (
                              <NativeSelectOption key={font}>{font}</NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </Row>
                        <Row title="Tamaño de texto">
                          <Slider
                            label="Tamaño de texto"
                            value={settings.fontSize}
                            min={12}
                            max={18}
                            unit=" px"
                            onChange={(fontSize) => onChange({ fontSize })}
                          />
                        </Row>
                      </Group>
                    </>
                  )}
                  {section === "shortcuts" && (
                    <>
                      <Alert>
                        <KeyboardIcon />
                        <AlertTitle>Cambiar un atajo</AlertTitle>
                        <AlertDescription>
                          Pulsa su combinación actual y después las nuevas teclas. Incluye Ctrl o
                          Alt. Escape cancela la captura.
                        </AlertDescription>
                      </Alert>
                      <FieldGroup>
                        {(
                          [
                            ["search", "Buscar utilidades", "Ir al buscador del catálogo."],
                            ["settings", "Abrir ajustes", "Volver a esta pantalla."],
                            [
                              "catalog",
                              "Abrir catálogo",
                              "Ver todas las utilidades de esta sección.",
                            ],
                          ] as const
                        ).map(([name, title, detail]) => (
                          <Row key={name} title={title} detail={detail}>
                            <Button
                              type="button"
                              variant={recording === name ? "secondary" : "outline"}
                              className={cn(
                                "h-auto min-h-8 max-w-full flex-wrap",
                                recording === name && "justify-start",
                              )}
                              aria-label={`${title}: ${recording === name ? "esperando combinación" : settings.shortcuts[name]}`}
                              onClick={() => {
                                setRecording(name);
                                setError("");
                              }}
                              onBlur={() => {
                                if (recording === name) setRecording(null);
                              }}
                              onKeyDown={(event) => captureShortcut(event, name)}
                            >
                              {recording === name ? (
                                <span className="whitespace-normal">Pulsa una combinación…</span>
                              ) : (
                                <KbdGroup className="flex-wrap">
                                  {settings.shortcuts[name].split("+").map((key, index) => (
                                    <Kbd key={`${key}-${index}`}>{key}</Kbd>
                                  ))}
                                </KbdGroup>
                              )}
                            </Button>
                          </Row>
                        ))}
                      </FieldGroup>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Los atajos solo actúan dentro de PDF Utils. Algunas combinaciones están
                        reservadas por Windows.
                      </p>
                    </>
                  )}
                  {section === "about" && (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileTextIcon aria-hidden="true" />
                            PDF Utils
                          </CardTitle>
                          <CardDescription>
                            Herramientas para tus documentos e imágenes.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <FieldGroup>
                            <Row title="Versión instalada">
                              <Badge variant="outline">{version}</Badge>
                            </Row>
                            <Row title="Canal de actualización">
                              <Badge variant="secondary">Estable</Badge>
                            </Row>
                          </FieldGroup>
                        </CardContent>
                        <CardFooter>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Los documentos se procesan en tu equipo. Algunas utilidades necesitan
                            motores locales adicionales.
                          </p>
                        </CardFooter>
                      </Card>
                      <Card aria-live="polite">
                        <CardHeader>
                          <CardTitle>{updater.label}</CardTitle>
                          <CardDescription>{updater.detail}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                          {updater.version && (
                            <Badge variant="outline">Versión disponible: {updater.version}</Badge>
                          )}
                          {typeof updater.progress === "number" && (
                            <Progress
                              aria-label="Progreso de la actualización"
                              value={Math.max(0, Math.min(100, updater.progress))}
                            />
                          )}
                          <Button
                            type="button"
                            className="h-auto min-h-8 self-start whitespace-normal text-left"
                            disabled={!updater.canAct || checking}
                            onClick={() => void update()}
                          >
                            {checking && <Spinner data-icon="inline-start" />}
                            {updater.label}
                          </Button>
                        </CardContent>
                        <CardFooter>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {updater.lastChecked
                              ? `Última comprobación: ${new Date(updater.lastChecked).toLocaleString("es-ES")}`
                              : "Todavía no se ha comprobado esta sesión."}
                          </p>
                        </CardFooter>
                      </Card>
                    </>
                  )}
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Los cambios se guardan automáticamente.
                  </p>
                </>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </section>
  );
}
