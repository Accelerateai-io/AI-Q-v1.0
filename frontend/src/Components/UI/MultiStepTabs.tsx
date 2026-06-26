import React, { useRef, useEffect } from "react"
import type { LucideIcon } from "lucide-react"
import { CircleChevronLeft, CircleChevronRight } from "lucide-react"
import "./MultiStepTabs.css"

export interface MultiStepTabStep {
  id: string
  label: string
  icon: LucideIcon
  content?: React.ReactNode
}

export interface MultiStepTabsProps {
  /** Steps: id, label, icon, and optional content for each step */
  steps: MultiStepTabStep[]
  /** Current step index (0-based) */
  currentStep: number
  /** Callback when user selects a step */
  onStepChange: (stepIndex: number) => void
  /** Indices of steps considered completed (used for percentage). Defaults to all steps before current. */
  completedSteps?: number[]
  /** Step indices that are disabled (e.g. until previous steps are valid). Clicking them does nothing. */
  disabledSteps?: number[]
  /** When false, the "next step" (forward) tab icon is disabled (e.g. current step data not filled). When enabled, clicking it only advances the step; it does not run Continue validation. Default true. */
  canGoNext?: boolean
  /** Optional class name for the root container */
  className?: string
}

/**
 * Reusable multi-step form tabs with progress bar.
 * Left: "Step X of Y". Right: completion percentage. Progress bar and tab list with icons.
 */
function MultiStepTabs({
  steps,
  currentStep,
  onStepChange,
  completedSteps,
  disabledSteps = [],
  canGoNext = true,
  className = "",
}: MultiStepTabsProps) {
  const total = steps.length
  const completed =
    completedSteps ??
    Array.from({ length: currentStep }, (_, i) => i)
  // Percentage: include current step so last step shows 100% (step 1 = 10%, step 2 = 20%, … last = 100%)
  const percentage =
    total > 0
      ? Math.min(100, Math.round(((currentStep + 1) / total) * 100))
      : 0

  const activeTabRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    })
  }, [currentStep])

  return (
    <div className={`multi_step_tabs ${className}`.trim()}>
      {/* Progress bar above the form */}
      <div className="multi_step_tabs_progress_header">
        <span className="multi_step_tabs_step_label" aria-live="polite">
          Step {currentStep + 1} of {total}
        </span>
        <span className="multi_step_tabs_percent">{percentage}%</span>
      </div>

      <div
        className="multi_step_tabs_progress_bar"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Form completion"
      >
        <div
          className="multi_step_tabs_progress_fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Tabs with prev/next move icons */}
      <div className="multi_step_tabs_nav_wrapper">
        <button
          type="button"
          className="multi_step_tabs_nav_btn multi_step_tabs_nav_btn_prev"
          onClick={() => currentStep > 0 && onStepChange(currentStep - 1)}
          disabled={currentStep === 0}
          aria-label="Previous step"
        >
          <CircleChevronLeft size={28} aria-hidden />
        </button>
        <div className="multi_step_tabs_list" role="tablist">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = completed.includes(index)
            const isDisabled = disabledSteps.includes(index)
            return (
              <button
                key={step.id}
                ref={isActive ? activeTabRef : undefined}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-disabled={isDisabled}
                aria-controls={`step-panel-${step.id}`}
                id={`step-tab-${step.id}`}
                className={`multi_step_tabs_tab ${isActive ? "multi_step_tabs_tab--active" : ""} ${isCompleted ? "multi_step_tabs_tab--completed" : ""} ${isDisabled ? "multi_step_tabs_tab--disabled" : ""}`}
                onClick={() => !isDisabled && onStepChange(index)}
              >
                <span className="multi_step_tabs_tab_icon">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="multi_step_tabs_tab_label">{step.label}</span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className="multi_step_tabs_nav_btn multi_step_tabs_nav_btn_next"
          onClick={() => canGoNext && currentStep < total - 1 && onStepChange(currentStep + 1)}
          disabled={currentStep === total - 1 || !canGoNext}
          aria-label="Next step"
          aria-disabled={currentStep === total - 1 || !canGoNext}
        >
          <CircleChevronRight size={28} aria-hidden />
        </button>
      </div>

      {/* Form content below progress and tabs */}
      <div
        id={`step-panel-${steps[currentStep]?.id}`}
        role="tabpanel"
        aria-labelledby={`step-tab-${steps[currentStep]?.id}`}
        className="multi_step_tabs_panel"
      >
        {steps[currentStep]?.content}
      </div>
    </div>
  )
}

export default MultiStepTabs
