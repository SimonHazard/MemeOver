import { NbButton } from "@memeover/ui/components/branded/nb-button";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@memeover/ui/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@memeover/ui/components/ui/avatar";
import { Button } from "@memeover/ui/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@memeover/ui/components/ui/dialog";
import { Input } from "@memeover/ui/components/ui/input";
import { Label } from "@memeover/ui/components/ui/label";
import { Progress } from "@memeover/ui/components/ui/progress";
import { ScrollArea } from "@memeover/ui/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@memeover/ui/components/ui/select";
import { Slider } from "@memeover/ui/components/ui/slider";
import { Toaster } from "@memeover/ui/components/ui/sonner";
import { Switch } from "@memeover/ui/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@memeover/ui/components/ui/tabs";
import { Toggle } from "@memeover/ui/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@memeover/ui/components/ui/tooltip";
import { MotionConfig } from "framer-motion";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { ConfirmActionButton } from "../../src/components/confirm-action-button";
import { ColorPicker } from "../../src/windows/settings/components/color-picker";
import "../../src/App.css";
import "../../src/i18n";

function App() {
	const [clicks, setClicks] = useState(0),
		[color, setColor] = useState("#FFFFFF"),
		[select, setSelect] = useState("one"),
		[multi, setMulti] = useState<string[]>(["one"]),
		[range, setRange] = useState([20, 80]);
	return (
		<MotionConfig reducedMotion="user">
			<TooltipProvider>
				<div style={{ padding: 40, maxWidth: 600 }}>
					<NbButton onClick={() => setClicks((c) => c + 1)}>Action</NbButton>
					<NbButton disabled>Disabled action</NbButton>
					<NbButton size="lg">Large action</NbButton>
					<output id="clicks">{clicks}</output>
					<ConfirmActionButton
						label="Delete"
						title="Delete this item?"
						description="The item will be removed."
						confirmLabel="Delete item"
						onConfirm={() => setClicks((c) => c + 10)}
					/>
					<Label htmlFor="input">Name</Label>
					<Input id="input" />
					<Input aria-label="Disabled input" disabled />
					<Switch aria-label="Enabled switch" />
					<Switch aria-label="Disabled switch" disabled />
					<Toggle aria-label="Toggle">Toggle</Toggle>
					<ToggleGroup multiple value={multi} onValueChange={setMulti}>
						<ToggleGroupItem value="one">First</ToggleGroupItem>
						<ToggleGroupItem value="two">Second</ToggleGroupItem>
						<ToggleGroupItem disabled value="three">
							Disabled toggle
						</ToggleGroupItem>
					</ToggleGroup>
					<output id="multi">{multi.join(",")}</output>
					<Select
						value={select}
						onValueChange={(v) => {
							if (v) setSelect(v);
						}}
						items={[
							{ label: "One", value: "one" },
							{ label: "Two", value: "two" },
						]}
					>
						<SelectTrigger aria-label="Select">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="one">One</SelectItem>
								<SelectItem value="two">Two</SelectItem>
								<SelectItem value="disabled" disabled>
									Disabled option
								</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
					<Slider aria-label="Range" value={range} onValueChange={setRange} />
					<output id="range">{range.join(",")}</output>
					<Slider aria-label="Disabled slider" defaultValue={50} disabled />
					<Tabs defaultValue="a">
						<TabsList>
							<TabsTrigger value="a">Tab A</TabsTrigger>
							<TabsTrigger value="b">Tab B</TabsTrigger>
							<TabsTrigger disabled value="c">
								Disabled tab
							</TabsTrigger>
						</TabsList>
						<TabsContent value="a">Panel A</TabsContent>
						<TabsContent value="b">Panel B</TabsContent>
					</Tabs>
					<Accordion multiple>
						<AccordionItem value="a">
							<AccordionTrigger>Accordion A</AccordionTrigger>
							<AccordionContent>Content A</AccordionContent>
						</AccordionItem>
						<AccordionItem value="b">
							<AccordionTrigger>Accordion B</AccordionTrigger>
							<AccordionContent>Content B</AccordionContent>
						</AccordionItem>
					</Accordion>
					<Dialog>
						<DialogTrigger render={<Button />}>Open dialog</DialogTrigger>
						<DialogContent>
							<DialogTitle>Test dialog</DialogTitle>
							<DialogDescription>Description</DialogDescription>
							<Input aria-label="Dialog input" />
							<DialogClose render={<Button />}>Done</DialogClose>
						</DialogContent>
					</Dialog>
					<Tooltip>
						<TooltipTrigger render={<Button />}>Tooltip target</TooltipTrigger>
						<TooltipContent>Helpful information</TooltipContent>
					</Tooltip>
					<ColorPicker value={color} onChange={setColor} onReset={() => setColor("#FFFFFF")} />
					<output id="color">{color}</output>
					<ScrollArea className="h-32" aria-label="Scrollable content">
						<div style={{ height: 600 }}>
							Scroll start<div style={{ paddingTop: 500 }}>Scroll end</div>
						</div>
					</ScrollArea>
					<Progress value={35} aria-label="Download progress" />
					<Progress value={null} aria-label="Indeterminate progress" />
					<Avatar>
						<AvatarImage src="data:image/png;base64,broken" alt="Broken image" />
						<AvatarFallback>AB</AvatarFallback>
					</Avatar>
					<Button onClick={() => toast.success("Toast works")}>Show toast</Button>
					<Toaster />
				</div>
			</TooltipProvider>
		</MotionConfig>
	);
}
const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
