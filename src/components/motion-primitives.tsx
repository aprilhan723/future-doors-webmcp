"use client";

// Adapted from Motion Primitives by ibelick (MIT).
// Source patterns: animated-background, animated-group, spotlight, and tilt.
// https://github.com/ibelick/motion-primitives

import {
  Children,
  cloneElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  type SpringOptions,
  type Transition,
  type Variants,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

type SelectableChild = ReactElement<{
  "data-id": string;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
}>;

export function AnimatedBackground({
  children,
  defaultValue,
  onValueChange,
  className,
  transition,
}: {
  children: SelectableChild[] | SelectableChild;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  transition?: Transition;
}) {
  const [localActiveId, setLocalActiveId] = useState(defaultValue ?? "");
  const activeId = defaultValue ?? localActiveId;
  const uniqueId = useId();

  return Children.map(children, (child) => {
    const id = child.props["data-id"];
    return cloneElement(
      child,
      {
        className: ["motion-selectable", child.props.className].filter(Boolean).join(" "),
        "data-checked": activeId === id ? "true" : "false",
        onClick: () => {
          setLocalActiveId(id);
          onValueChange?.(id);
        },
      } as Partial<typeof child.props>,
      <>
        <AnimatePresence initial={false}>
          {activeId === id ? (
            <motion.span
              layoutId={`selection-${uniqueId}`}
              className={className}
              transition={transition}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
            />
          ) : null}
        </AnimatePresence>
        <span className="motion-selectable-content">{child.props.children}</span>
      </>,
    );
  });
}

const groupPresets: Record<"fade" | "blur-slide" | "scale", Variants> = {
  fade: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  "blur-slide": {
    hidden: { opacity: 0, filter: "blur(7px)", y: 18 },
    visible: { opacity: 1, filter: "blur(0px)", y: 0 },
  },
  scale: { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1 } },
};

export function AnimatedGroup({
  children,
  className,
  preset = "blur-slide",
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  preset?: keyof typeof groupPresets;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: stagger } } }}
    >
      {Children.map(children, (child, index) => (
        <motion.div key={index} variants={groupPresets[preset]} transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

export function Tilt({
  children,
  className,
  rotationFactor = 5,
  springOptions = { stiffness: 260, damping: 24 },
}: {
  children: ReactNode;
  className?: string;
  rotationFactor?: number;
  springOptions?: SpringOptions;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x, springOptions);
  const ySpring = useSpring(y, springOptions);
  const rotateX = useTransform(ySpring, [-0.5, 0.5], [-rotationFactor, rotationFactor]);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], [rotationFactor, -rotationFactor]);
  const transform = useMotionTemplate`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ transformStyle: "preserve-3d", transform }}
      onMouseMove={(event) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set((event.clientX - rect.left) / rect.width - 0.5);
        y.set((event.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

export function Spotlight({
  className,
  size = 320,
}: {
  className?: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [parent, setParent] = useState<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const mouseX = useSpring(0, { bounce: 0, stiffness: 170, damping: 24 });
  const mouseY = useSpring(0, { bounce: 0, stiffness: 170, damping: 24 });
  const left = useTransform(mouseX, (value) => `${value - size / 2}px`);
  const top = useTransform(mouseY, (value) => `${value - size / 2}px`);

  useEffect(() => {
    const element = ref.current?.parentElement;
    if (!element) return;
    element.style.position = "relative";
    element.style.overflow = "hidden";
    setParent(element);
  }, []);

  const handleMove = useCallback((event: MouseEvent) => {
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left);
    mouseY.set(event.clientY - rect.top);
  }, [mouseX, mouseY, parent]);

  useEffect(() => {
    if (!parent) return;
    const controller = new AbortController();
    parent.addEventListener("mousemove", handleMove, { signal: controller.signal });
    parent.addEventListener("mouseenter", () => setHovered(true), { signal: controller.signal });
    parent.addEventListener("mouseleave", () => setHovered(false), { signal: controller.signal });
    return () => controller.abort();
  }, [handleMove, parent]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ width: size, height: size, left, top }}
      animate={{ opacity: hovered ? 1 : 0 }}
      transition={{ duration: 0.2 }}
      aria-hidden="true"
    />
  );
}
