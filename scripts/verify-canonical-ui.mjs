import fs from "node:fs";
import path from "node:path";

const root=process.cwd();const app=path.join(root,"app");const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const cssFiles=[];function walkCss(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walkCss(file);else if(/\.(css|scss|sass|less)$/.test(entry.name))cssFiles.push(path.relative(root,file));}}walkCss(app);
const layout=read("app/layout.tsx");const layoutCssImports=[...layout.matchAll(/import\s+"\.\/([^"]+\.css)"/g)].map((match)=>`app/${match[1]}`);
const routeCssImports=[];function walkSource(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walkSource(file);else if(/\.(tsx?|jsx?)$/.test(entry.name)){const rel=path.relative(root,file);const source=fs.readFileSync(file,"utf8");if(rel!=="app/layout.tsx"&&/import\s+[^;\n]+\.css/.test(source))routeCssImports.push(rel);}}}walkSource(app);
const required=["app/canonical.css","app/design-tokens.css","app/design-system.css","app/styles/canonical-public.css","app/styles/canonical-auth.css","app/styles/canonical-motion.css"];
const approvedModules=["app/styles/canonical-foundation.css","app/styles/canonical-public.css","app/styles/canonical-products.css","app/styles/canonical-corporate.css","app/styles/canonical-account.css","app/styles/canonical-commerce.css","app/styles/canonical-auth.css","app/styles/canonical-motion.css"];
const missingRequired=required.filter((file)=>!fs.existsSync(path.join(root,file))||!layoutCssImports.includes(file));
const unownedCss=cssFiles.filter((file)=>!layoutCssImports.includes(file)&&!approvedModules.includes(file));
const canonicalFiles=["app/canonical.css",...approvedModules.filter((file)=>fs.existsSync(path.join(root,file)))];const canonicalSource=canonicalFiles.map(read).join("\n");
let braceBalance=0;for(const char of canonicalSource)braceBalance+=char==="{"?1:char==="}"?-1:0;
const checks={canonicalStylesheet:fs.existsSync(path.join(root,"app/canonical.css")),rootOwnsCanonicalStylesheet:layout.includes('import "./canonical.css";'),requiredRootLayers:missingRequired.length===0,noUnownedStylesheets:unownedCss.length===0,approvedCanonicalModulesOnly:cssFiles.filter((file)=>file.startsWith("app/styles/canonical-")).every((file)=>approvedModules.includes(file)),balancedBraces:braceBalance===0,noImportant:!/!important\b/.test(canonicalSource),noLegacyYiTokens:!/var\(--yi-/.test(canonicalSource),noRouteCssImports:routeCssImports.length===0,p8CorporateEditorContract:[".p8-corporate-editor",".p8-editor-grid",".p8-preview-column"].every((selector)=>canonicalSource.includes(selector))};
console.log(JSON.stringify({...checks,canonicalFiles,layoutCssImports,routeCssImports,missingRequired,unownedCss},null,2));if(!Object.values(checks).every(Boolean))process.exit(1);
