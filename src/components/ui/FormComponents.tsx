'use client'

import React from 'react'
import { cn } from '@/lib/utils'

// Base input styling that's consistent across all form elements
const baseInputClasses = "w-full px-4 py-3 rounded-lg border text-white placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none"

const baseInputStyles = {
  backgroundColor: 'var(--color-slate)',
  borderColor: 'var(--color-steel)'
}

const focusInputStyles = {
  borderColor: 'var(--color-green)'
}

// Standardized Text Input
interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export function TextInput({ 
  label, 
  error, 
  icon, 
  className, 
  style,
  ...props 
}: TextInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-white">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={cn(
            baseInputClasses,
            icon && "pl-10",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          style={{
            ...baseInputStyles,
            ...style
          }}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}

// Standardized Select Dropdown
interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export function Select({ 
  label, 
  error, 
  options, 
  placeholder = "Select an option...",
  className, 
  style,
  ...props 
}: SelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-white">
          {label}
        </label>
      )}
      <select
        className={cn(
          baseInputClasses,
          "cursor-pointer",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
        style={{
          ...baseInputStyles,
          ...style
        }}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}

// Standardized Search Input with search icon
interface SearchInputProps extends Omit<TextInputProps, 'type' | 'icon'> {
  onClear?: () => void
}

export function SearchInput({ onClear, value, ...props }: SearchInputProps) {
  return (
    <div className="relative">
      <TextInput
        type="text"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        value={value}
        style={{
          paddingRight: value && onClear ? '40px' : undefined
        }}
        {...props}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// Standardized Filter Section Container
interface FilterSectionProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
}

export function FilterContainer({ children, className, title, description }: FilterSectionProps) {
  return (
    <div 
      className={cn("border-b", className)}
      style={{backgroundColor: 'var(--color-midnight)', borderColor: 'var(--color-steel)'}}
    >
      <div className="max-w-7xl mx-auto px-6 py-6">
        {(title || description) && (
          <div className="mb-4">
            {title && <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>}
            {description && <p className="text-sm text-gray-400">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// Standardized Filter Grid Layout
interface FilterGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5 | 6
  className?: string
}

export function FilterGrid({ children, columns = 4, className }: FilterGridProps) {
  const gridClasses = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3", 
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-5",
    6: "grid-cols-1 md:grid-cols-2 lg:grid-cols-6"
  }
  
  return (
    <div className={cn("grid gap-4", gridClasses[columns], className)}>
      {children}
    </div>
  )
}

// Quick Filter Buttons (for common actions like reset, sort direction)
interface QuickFilterProps {
  children: React.ReactNode
  className?: string
}

export function QuickFilterActions({ children, className }: QuickFilterProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {children}
    </div>
  )
}

// Filter Toggle Button (for sort direction, active/inactive states)
interface FilterToggleProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}

export function FilterToggle({ active, onClick, children, className }: FilterToggleProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
        active 
          ? "bg-green-600 text-white border-green-600" 
          : "text-gray-300 border hover:text-white",
        className
      )}
      style={!active ? {
        backgroundColor: 'var(--color-gunmetal)',
        borderColor: 'var(--color-steel)'
      } : undefined}
    >
      {children}
    </button>
  )
}

// Complete filter stats summary component
interface FilterStatsProps {
  total: number
  filtered: number
  label: string
  className?: string
}

export function FilterStats({ total, filtered, label, className }: FilterStatsProps) {
  return (
    <div className={cn("text-sm text-gray-400", className)}>
      Showing <span className="text-white font-medium">{filtered.toLocaleString()}</span> of <span className="text-white font-medium">{total.toLocaleString()}</span> {label}
    </div>
  )
}
