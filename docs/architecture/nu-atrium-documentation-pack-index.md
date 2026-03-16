# NU Atrium Documentation Pack Index

## 1. Purpose
Этот файл — навигация по всей документации NU Atrium.  
Он нужен, чтобы быстро понять:

- какие документы уже существуют,
- какой документ за что отвечает,
- какой документ использовать в новом чате,
- какой документ использовать для rebuild,
- какой документ использовать для UI/UX,
- в каком порядке их читать.

---

## 2. Documentation overview

### A. UI/UX Master Spec
**File:**
```text
docs/design/nu-atrium-ui-ux-master-spec.md
```

**Что это:**
Главный дизайн-спек продукта.

**Что внутри:**
- visual direction
- design philosophy
- color/spacing/typography rules
- component rules
- page structure rules
- UX principles
- premium product feel requirements

**Когда использовать:**
- если работа идёт по UI/UX
- если нужно делать redesign
- если нужно сохранить визуальную консистентность
- если работаешь над новыми страницами и хочешь, чтобы они соответствовали общему стилю

**Давать Codex, когда:**
- нужно сделать redesign pass
- нужно внедрить shared design system
- нужно привести новую страницу в стиль продукта

---

### B. Full System Blueprint
**File:**
```text
docs/architecture/nu-atrium-full-system-blueprint.md
```

**Что это:**
Широкое описание всей системы NU Atrium.

**Что внутри:**
- product overview
- domain map
- route map
- database domain groups
- security model
- operations layer
- admin functionality
- campus module
- launch philosophy

**Когда использовать:**
- когда нужно быстро объяснить проект новому чату
- когда нужен архитектурный обзор
- когда нужно понять, что вообще входит в продукт

**Давать новому чату, когда:**
- нужен общий контекст
- нужно продолжить работу без пересказа всей истории

---

### C. Rebuild Checklist
**File:**
```text
docs/architecture/nu-atrium-rebuild-checklist.md
```

**Что это:**
Execution checklist, по которому можно пересобирать проект шаг за шагом.

**Что внутри:**
- phase-by-phase rebuild steps
- checkbox-style порядок работы
- какие модули строить в каком порядке
- launch checklist в rebuild-логике

**Когда использовать:**
- когда реально пересобираешь проект с нуля
- когда нужен практический TODO-список
- когда хочешь идти по шагам, а не читать длинное описание

**Лучший use-case:**
строить заново и отмечать:
- [ ] сделано
- [ ] не сделано

---

### D. Full Rebuild File
**File:**
```text
docs/architecture/nu-atrium-full-rebuild-file.md
```

**Что это:**
Самый полный rebuild-документ.  
Это уже не checklist, а **подробное rebuild reference**.

**Что внутри:**
- product definition
- tech stack
- route map
- folder structure
- layouts
- design system
- table-by-table rebuild outline
- RLS model
- rebuild order
- feature dependency map
- ops layer
- production checklist
- architectural decisions to preserve

**Когда использовать:**
- если хочешь пересобрать проект с нуля максимально правильно
- если нужен один большой документ, который объясняет всё
- если нужно дать Codex/новому чату полный rebuild context

**Разница с checklist:**
- checklist = короткий execution TODO
- full rebuild file = полный rebuild reference

---

### E. One-File Master Prompt
**File (recommended):**
```text
docs/architecture/nu-atrium-master-prompt.md
```

**Что это:**
Один master prompt для нового чата или Codex.

**Что внутри:**
- полное проектное описание в prompt-формате
- все архитектурные решения
- product scope
- design rules
- security rules
- operational rules
- как правильно работать с проектом

**Когда использовать:**
- в новом чате
- для передачи контекста Codex
- когда не хочется заново всё объяснять

**Лучший use-case:**
скопировал → вставил → новый чат уже понимает проект.

---

## 3. Which file to use for what

### Если ты хочешь продолжить работу в новом чате
Используй:
1. `nu-atrium-master-prompt.md`
или
2. `nu-atrium-full-system-blueprint.md`

### Если ты хочешь делать UI/UX изменения
Используй:
1. `nu-atrium-ui-ux-master-spec.md`

### Если ты хочешь пересобрать проект с нуля
Используй:
1. `nu-atrium-full-rebuild-file.md`
2. `nu-atrium-rebuild-checklist.md`

### Если ты хочешь быстро понять проект в целом
Используй:
1. `nu-atrium-full-system-blueprint.md`

---

## 4. Recommended reading order

### Для нового разработчика / нового чата
1. `nu-atrium-full-system-blueprint.md`
2. `nu-atrium-master-prompt.md`

### Для rebuild с нуля
1. `nu-atrium-full-rebuild-file.md`
2. `nu-atrium-rebuild-checklist.md`

### Для UI/UX работы
1. `nu-atrium-ui-ux-master-spec.md`
2. потом уже код/страницы

---

## 5. Best file to paste into a new chat

Если нужен **один лучший файл** для нового чата, то это:

```text
docs/architecture/nu-atrium-master-prompt.md
```

Если нужен **чуть более человеческий и менее prompt-like контекст**, тогда:

```text
docs/architecture/nu-atrium-full-system-blueprint.md
```

---

## 6. Best file to give Codex for rebuilding from scratch

Лучший порядок:

### Main reference:
```text
docs/architecture/nu-atrium-full-rebuild-file.md
```

### Execution companion:
```text
docs/architecture/nu-atrium-rebuild-checklist.md
```

### UI consistency reference:
```text
docs/design/nu-atrium-ui-ux-master-spec.md
```

---

## 7. Best file to use during launch / QA

Для pre-launch / QA лучше использовать:
- `nu-atrium-full-system-blueprint.md`
- launch checklist (если вынесен отдельно)
- operational env/cron checks

Если нужно, можно потом ещё сделать отдельный:
```text
docs/launch/nu-atrium-launch-checklist.md
```

---

## 8. Recommended final docs structure

```text
docs/
  architecture/
    nu-atrium-full-system-blueprint.md
    nu-atrium-full-rebuild-file.md
    nu-atrium-rebuild-checklist.md
    nu-atrium-master-prompt.md
    nu-atrium-documentation-pack-index.md
  design/
    nu-atrium-ui-ux-master-spec.md
```

---

## 9. Practical usage examples

### Example A — new chat
Paste:
1. `nu-atrium-master-prompt.md`
2. then say:
```text
Use this as the full project source of truth. Continue from this state with targeted next steps only.
```

### Example B — Codex rebuild
Give:
1. `nu-atrium-full-rebuild-file.md`
2. `nu-atrium-rebuild-checklist.md`
3. then ask for one module only:
```text
Use these rebuild documents as source of truth. Now generate a plan for rebuilding only the marketplace domain.
```

### Example C — UI work
Give:
1. `nu-atrium-ui-ux-master-spec.md`
2. then ask:
```text
Use this design spec as the source of truth. Audit the current page and propose a targeted redesign plan only.
```

---

## 10. Final recommendation

Если тебе нужен **самый полезный минимальный набор**, держи эти 3 файла как основные:

1. **Architecture overview**
```text
docs/architecture/nu-atrium-full-system-blueprint.md
```

2. **Full rebuild reference**
```text
docs/architecture/nu-atrium-full-rebuild-file.md
```

3. **UI/UX source of truth**
```text
docs/design/nu-atrium-ui-ux-master-spec.md
```

Если нужен **один файл для нового чата**:
```text
docs/architecture/nu-atrium-master-prompt.md
```
