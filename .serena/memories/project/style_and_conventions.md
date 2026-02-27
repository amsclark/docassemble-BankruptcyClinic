# Code Style & Conventions

## YAML (docassemble interviews)
- Standard docassemble YAML format with `---` block separators
- `mandatory: true` blocks drive the interview flow
- `code:` blocks set variables and control logic
- `question:` blocks define UI screens
- `fields:` blocks define form fields
- Objects defined via `objects:` block using DAObject, DAList
- PDF attachments use `attachment:` blocks with field mapping dicts
- `complete_attribute: 'complete'` pattern for list gathering
- Variable naming: snake_case throughout

## Python
- Classes extend docassemble.base.util types (DAObject, Individual, DAList)
- No type hints used (except in county_list.py)
- No docstrings except in objects.py get_exemption_choices()
- No automated linting or formatting

## JavaScript
- Vanilla JS, no framework
- Functions exposed on `window` for docassemble integration
- Used for client-side exemption validation

## TypeScript (tests)
- Playwright test format
- Helper functions for common docassemble interactions
- Base64 encoding of variable names to match docassemble field IDs

## Task Completion Checklist
1. Run `npm test` to validate tests pass
2. Check for YAML syntax issues
3. Verify PDF field mappings
4. Test on live server if possible
