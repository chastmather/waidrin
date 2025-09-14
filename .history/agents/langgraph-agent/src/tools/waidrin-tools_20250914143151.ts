import { readFile, writeFile } from "fs-extra";
import { join, resolve } from "path";
import { execa } from "execa";
import type { ToolResult } from "@/types";
import { CodebaseTools } from "./codebase-tools";

export class WaidrinTools {
  private projectRoot: string;
  private codebaseTools: CodebaseTools;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.codebaseTools = new CodebaseTools(projectRoot);
  }

  /**
   * Get Waidrin game state
   */
  async getGameState(): Promise<ToolResult> {
    try {
      const stateFile = join(this.projectRoot, "lib", "state.ts");
      const result = await this.codebaseTools.readFile(stateFile);
      
      if (!result.success) {
        return result;
      }

      const content = result.data.content as string;
      const gameState = this.extractGameState(content);

      return {
        success: true,
        data: gameState,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update Waidrin game state
   */
  async updateGameState(updates: Record<string, unknown>): Promise<ToolResult> {
    try {
      const stateFile = join(this.projectRoot, "lib", "state.ts");
      const result = await this.codebaseTools.readFile(stateFile);
      
      if (!result.success) {
        return result;
      }

      const content = result.data.content as string;
      const updatedContent = this.applyStateUpdates(content, updates);

      return await this.codebaseTools.writeFile(stateFile, updatedContent);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get Waidrin schemas
   */
  async getSchemas(): Promise<ToolResult> {
    try {
      const schemasFile = join(this.projectRoot, "lib", "schemas.ts");
      const result = await this.codebaseTools.readFile(schemasFile);
      
      if (!result.success) {
        return result;
      }

      const content = result.data.content as string;
      const schemas = this.extractSchemas(content);

      return {
        success: true,
        data: schemas,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add new schema to Waidrin
   */
  async addSchema(schemaName: string, schemaDefinition: string): Promise<ToolResult> {
    try {
      const schemasFile = join(this.projectRoot, "lib", "schemas.ts");
      const result = await this.codebaseTools.readFile(schemasFile);
      
      if (!result.success) {
        return result;
      }

      const content = result.data.content as string;
      const updatedContent = this.addSchemaToFile(content, schemaName, schemaDefinition);

      return await this.codebaseTools.writeFile(schemasFile, updatedContent);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get Waidrin prompts
   */
  async getPrompts(): Promise<ToolResult> {
    try {
      const promptsFile = join(this.projectRoot, "lib", "prompts.ts");
      const result = await this.codebaseTools.readFile(promptsFile);
      
      if (!result.success) {
        return result;
      }

      const content = result.data.content as string;
      const prompts = this.extractPrompts(content);

      return {
        success: true,
        data: prompts,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add new prompt to Waidrin
   */
  async addPrompt(promptName: string, promptDefinition: string): Promise<ToolResult> {
    try {
      const promptsFile = join(this.projectRoot, "lib", "prompts.ts");
      const result = await this.codebaseTools.readFile(promptsFile);
      
      if (!result.success) {
        return result;
      }

      const content = result.data.content as string;
      const updatedContent = this.addPromptToFile(content, promptName, promptDefinition);

      return await this.codebaseTools.writeFile(promptsFile, updatedContent);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get Waidrin components
   */
  async getComponents(): Promise<ToolResult> {
    try {
      const componentsDir = join(this.projectRoot, "components");
      const result = await this.codebaseTools.listDirectory(componentsDir);
      
      if (!result.success) {
        return result;
      }

      const components = result.data.items
        .filter(item => item.isFile && item.name.endsWith(".tsx"))
        .map(item => ({
          name: item.name.replace(".tsx", ""),
          file: item.name,
          path: join("components", item.name),
        }));

      return {
        success: true,
        data: {
          components,
          count: components.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a new Waidrin component
   */
  async createComponent(componentName: string, componentCode: string): Promise<ToolResult> {
    try {
      const componentFile = join(this.projectRoot, "components", `${componentName}.tsx`);
      return await this.codebaseTools.writeFile(componentFile, componentCode);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get Waidrin views
   */
  async getViews(): Promise<ToolResult> {
    try {
      const viewsDir = join(this.projectRoot, "views");
      const result = await this.codebaseTools.listDirectory(viewsDir);
      
      if (!result.success) {
        return result;
      }

      const views = result.data.items
        .filter(item => item.isFile && item.name.endsWith(".tsx"))
        .map(item => ({
          name: item.name.replace(".tsx", ""),
          file: item.name,
          path: join("views", item.name),
        }));

      return {
        success: true,
        data: {
          views,
          count: views.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a new Waidrin view
   */
  async createView(viewName: string, viewCode: string): Promise<ToolResult> {
    try {
      const viewFile = join(this.projectRoot, "views", `${viewName}.tsx`);
      return await this.codebaseTools.writeFile(viewFile, viewCode);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get Waidrin plugins
   */
  async getPlugins(): Promise<ToolResult> {
    try {
      const pluginsDir = join(this.projectRoot, "plugins");
      const result = await this.codebaseTools.listDirectory(pluginsDir);
      
      if (!result.success) {
        return result;
      }

      const plugins = [];
      for (const item of result.data.items) {
        if (item.isDirectory) {
          const manifestFile = join(pluginsDir, item.name, "manifest.json");
          const manifestResult = await this.codebaseTools.readFile(manifestFile);
          
          if (manifestResult.success) {
            const manifest = JSON.parse(manifestResult.data.content as string);
            plugins.push({
              name: item.name,
              manifest,
              path: join("plugins", item.name),
            });
          }
        }
      }

      return {
        success: true,
        data: {
          plugins,
          count: plugins.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a new Waidrin plugin
   */
  async createPlugin(pluginName: string, manifest: Record<string, unknown>, mainCode: string): Promise<ToolResult> {
    try {
      const pluginDir = join(this.projectRoot, "plugins", pluginName);
      const manifestFile = join(pluginDir, "manifest.json");
      const mainFile = join(pluginDir, "main.js");

      // Create plugin directory
      await this.codebaseTools.executeCommand("mkdir", ["-p", pluginDir]);

      // Write manifest
      const manifestResult = await this.codebaseTools.writeFile(manifestFile, JSON.stringify(manifest, null, 2));
      if (!manifestResult.success) {
        return manifestResult;
      }

      // Write main file
      return await this.codebaseTools.writeFile(mainFile, mainCode);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run Waidrin development server
   */
  async startDevServer(): Promise<ToolResult> {
    return await this.codebaseTools.executeCommand("npm", ["run", "dev"]);
  }

  /**
   * Build Waidrin project
   */
  async buildProject(): Promise<ToolResult> {
    return await this.codebaseTools.executeCommand("npm", ["run", "build"]);
  }

  /**
   * Run Waidrin tests
   */
  async runTests(): Promise<ToolResult> {
    return await this.codebaseTools.executeCommand("npm", ["run", "test"]);
  }

  /**
   * Run Waidrin linting
   */
  async runLinting(): Promise<ToolResult> {
    return await this.codebaseTools.executeCommand("npm", ["run", "lint"]);
  }

  /**
   * Extract game state from state file
   */
  private extractGameState(content: string): Record<string, unknown> {
    // This is a simplified extraction - in reality, you'd want more sophisticated parsing
    const stateMatch = content.match(/export const initialState: State = ({[\s\S]*?});/);
    if (stateMatch) {
      try {
        // This would need proper parsing in a real implementation
        return { raw: stateMatch[1] };
      } catch {
        return { raw: stateMatch[1] };
      }
    }
    return {};
  }

  /**
   * Apply state updates to state file
   */
  private applyStateUpdates(content: string, updates: Record<string, unknown>): string {
    // This is a simplified implementation - in reality, you'd want more sophisticated updating
    let updatedContent = content;
    
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`(${key}:\\s*)([^,}]+)`, "g");
      updatedContent = updatedContent.replace(regex, `$1${JSON.stringify(value)}`);
    }
    
    return updatedContent;
  }

  /**
   * Extract schemas from schemas file
   */
  private extractSchemas(content: string): Record<string, unknown> {
    const schemas: Record<string, unknown> = {};
    const schemaRegex = /export const (\w+) = z\.([^;]+);/g;
    let match;

    while ((match = schemaRegex.exec(content)) !== null) {
      schemas[match[1]] = match[2];
    }

    return schemas;
  }

  /**
   * Add schema to schemas file
   */
  private addSchemaToFile(content: string, schemaName: string, schemaDefinition: string): string {
    const exportRegex = /export const (\w+) = z\.([^;]+);/g;
    const lastMatch = [...content.matchAll(exportRegex)].pop();
    
    if (lastMatch) {
      const insertIndex = lastMatch.index! + lastMatch[0].length;
      const newSchema = `\nexport const ${schemaName} = z.${schemaDefinition};\n`;
      return content.slice(0, insertIndex) + newSchema + content.slice(insertIndex);
    }
    
    return content + `\nexport const ${schemaName} = z.${schemaDefinition};\n`;
  }

  /**
   * Extract prompts from prompts file
   */
  private extractPrompts(content: string): Record<string, unknown> {
    const prompts: Record<string, unknown> = {};
    const promptRegex = /export const (\w+) = ({[\s\S]*?});/g;
    let match;

    while ((match = promptRegex.exec(content)) !== null) {
      prompts[match[1]] = match[2];
    }

    return prompts;
  }

  /**
   * Add prompt to prompts file
   */
  private addPromptToFile(content: string, promptName: string, promptDefinition: string): string {
    const exportRegex = /export const (\w+) = ({[\s\S]*?});/g;
    const lastMatch = [...content.matchAll(exportRegex)].pop();
    
    if (lastMatch) {
      const insertIndex = lastMatch.index! + lastMatch[0].length;
      const newPrompt = `\nexport const ${promptName} = ${promptDefinition};\n`;
      return content.slice(0, insertIndex) + newPrompt + content.slice(insertIndex);
    }
    
    return content + `\nexport const ${promptName} = ${promptDefinition};\n`;
  }
}
