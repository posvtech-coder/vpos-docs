# Flutter Widget → React/HTML Cheatsheet

## Layout

| Flutter | React (Tailwind) |
|---------|-----------------|
| `Column(children:[…])` | `<div className="flex flex-col gap-2">` |
| `Row(children:[…])` | `<div className="flex flex-row gap-2">` |
| `Stack(children:[…])` | `<div className="relative">` |
| `Positioned(top,left)` | `<div className="absolute top-0 left-0">` |
| `Expanded(flex:2)` | `<div style={{flex:2}}>` |
| `Flexible` | `<div className="flex-1 min-w-0">` |
| `SizedBox(w,h)` | `<div style={{width,height}}>` or Tailwind `w-` `h-` |
| `Padding(EdgeInsets)` | `className="p-4"` or `px-2 py-1` |
| `Center` | `className="flex items-center justify-center"` |
| `Align(Alignment.topRight)` | `className="flex justify-end items-start"` |
| `Wrap` | `className="flex flex-wrap gap-2"` |
| `AspectRatio(ratio)` | CSS `aspect-ratio: 16/9` |

## Scrolling

| Flutter | React |
|---------|-------|
| `SingleChildScrollView` | `<div className="overflow-auto">` |
| `ListView(children)` | `<ul className="overflow-y-auto">` |
| `ListView.builder` | `{items.map(i => <Item key={i.id} …/>)}` |
| `GridView.count(crossAxisCount:2)` | `<div className="grid grid-cols-2 gap-4">` |
| `CustomScrollView` / `Sliver` | Virtualised list (react-window) |

## Input

| Flutter | React |
|---------|-------|
| `TextField` | `<input type="text" />` |
| `TextFormField` | `<input>` inside `<form>` with react-hook-form |
| `Checkbox` | `<input type="checkbox" />` |
| `Switch` | `<input type="checkbox" role="switch" />` |
| `Slider` | `<input type="range" />` |
| `DropdownButton` | `<select>` |
| `DatePicker` | `<input type="date" />` or react-datepicker |

## Visual

| Flutter | React |
|---------|-------|
| `Icon(Icons.home)` | `<HomeIcon />` (lucide-react / heroicons) |
| `CircleAvatar` | `<img className="rounded-full w-10 h-10">` |
| `ClipRRect(borderRadius)` | `className="rounded-xl overflow-hidden"` |
| `Opacity(opacity:0.5)` | `className="opacity-50"` |
| `AnimatedOpacity` | CSS transition / framer-motion |
| `AnimatedContainer` | framer-motion `<motion.div>` |
| `Hero` | framer-motion `layoutId` |
| `LinearProgressIndicator` | `<progress>` or CSS progress bar |

## Overlay / Dialogs

| Flutter | React |
|---------|-------|
| `showDialog(…AlertDialog)` | Modal component (headlessui/radix) |
| `showModalBottomSheet` | Bottom-sheet component |
| `ScaffoldMessenger.showSnackBar` | react-hot-toast `toast(…)` |
| `Tooltip` | `title` attribute or Radix Tooltip |
| `PopupMenuButton` | Dropdown menu (Radix DropdownMenu) |
