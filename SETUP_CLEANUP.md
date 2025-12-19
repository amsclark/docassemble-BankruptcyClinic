# Cleanup Recommendations for Playwright MCP Setup

## Files to Remove (Unnecessary)

### 1. `/e2e/example.spec.ts`
**Reason**: This is the default Playwright boilerplate test file that tests playwright.dev website.
**Action**: Can be safely deleted as it's not related to your BankruptcyClinic testing.

```bash
rm -f e2e/example.spec.ts
```

### 2. Potentially the entire `/e2e` directory
**Reason**: Your playwright.config.ts has been updated to point to `./tests` directory instead of `./e2e`. The e2e directory only contains the example file.
**Action**: Remove if not needed for other purposes.

```bash
rmdir e2e  # after removing example.spec.ts
```

## Configuration Issues Fixed

### 1. `playwright.config.ts`
- ✅ **Fixed**: Changed `testDir` from `'./e2e'` to `'./tests'`
- ✅ **Added**: Base URL configuration for docassemble 
- ✅ **Added**: Better debugging options (screenshot, video on failure)

### 2. Test Organization
- ✅ **Enhanced**: MCP assistant now follows prompt.md guidelines
- ✅ **Added**: New `mcp-enhanced.spec.ts` demonstrating prompt.md patterns
- ✅ **Added**: Better TypeScript types and error handling

## Files Structure After Cleanup

```
/home/alex/docassemble-BankruptcyClinic/
├── mcp-server.ts              # ✅ MCP server implementation
├── mcp-server.js              # ❓ Check if this is auto-generated
├── package.json               # ✅ Updated with new scripts
├── playwright.config.ts       # ✅ Updated configuration
├── tsconfig.json              # ✅ TypeScript configuration
├── tests/
│   ├── mcp-assistant.ts       # ✅ Enhanced MCP helper class
│   ├── mcp-assisted.spec.ts   # ✅ Original MCP tests
│   ├── mcp-enhanced.spec.ts   # ✅ NEW: prompt.md guideline examples
│   ├── voluntary-petition-comprehensive.spec.ts  # ✅ Comprehensive tests
│   ├── state-aware-exemptions.spec.ts           # ✅ State-specific tests
│   └── [other test files]     # ✅ Keep existing tests
└── e2e/                       # ❌ Remove this directory
    └── example.spec.ts        # ❌ Remove this file
```

## New Scripts Available

Run these commands to use the enhanced MCP testing:

```bash
# Run the new prompt.md example tests
npm run test:mcp-enhanced

# Run with visible browser to see prompt.md patterns
npm run test:prompt-examples

# Debug the MCP-enhanced tests
npm run test:debug-mcp

# Run all MCP-related tests
npm run test:all-mcp
```

## MCP Integration Improvements

### What's Now Incorporated from prompt.md:

1. **Preferred Selectors**: Tests now use `getByRole()`, `getByLabel()`, and `getByText()`
2. **Auto-waits**: Removed manual `sleep()` calls, rely on Playwright's auto-waiting
3. **Test Organization**: Uses `test.describe()` and `test.step()` as recommended
4. **Base64 Field Handling**: Enhanced understanding of docassemble field encoding
5. **Debug Features**: Integration with `dasourcetoggle` and vars buttons
6. **Label-based Form Filling**: Prioritizes filling fields by their labels

### Enhanced MCP Assistant Features:

1. **Better Label Detection**: Multiple strategies for finding field labels
2. **Radio Group Analysis**: Proper handling of radio button groups
3. **Debug Tool Integration**: Can use docassemble's debug features
4. **Role-based Selectors**: Prefers accessibility-friendly selectors

## Verification Steps

1. Remove unnecessary files:
```bash
rm -f e2e/example.spec.ts
rmdir e2e
```

2. Test the setup:
```bash
npm run test:mcp-enhanced
```

3. Verify MCP server works:
```bash
npm run mcp-server
```

## Next Steps

1. **Remove the identified unnecessary files**
2. **Test the enhanced MCP functionality**
3. **Consider migrating existing tests to use the new prompt.md patterns**
4. **Use the MCP server for generating additional tests based on prompt.md guidelines**

The setup is now properly configured to follow prompt.md best practices while maintaining backward compatibility with existing tests.
