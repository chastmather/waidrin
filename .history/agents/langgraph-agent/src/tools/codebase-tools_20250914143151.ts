import { readFile, writeFile, readdir, stat, mkdir } from "fs-extra";
import { join, relative, resolve, dirname } from "path";
import { glob } from "fast-glob";
import { execa } from "execa";
import type { ToolResult } from "@/types";

export class CodebaseTools {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Read a file from the codebase
   */
  async readFile(filePath: string): Promise<ToolResult> {
    try {
      const fullPath = resolve(this.projectRoot, filePath);
      const content = await readFile(fullPath, "utf-8");
      
      return {
        success: true,
        data: {
          filePath,
          content,
          size: content.length,
          lines: content.split("\n").length,
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
   * Write content to a file
   */
  async writeFile(filePath: string, content: string): Promise<ToolResult> {
    try {
      const fullPath = resolve(this.projectRoot, filePath);
      const dir = dirname(fullPath);
      
      // Ensure directory exists
      await mkdir(dir, { recursive: true });
      
      await writeFile(fullPath, content, "utf-8");
      
      return {
        success: true,
        data: {
          filePath,
          size: content.length,
          lines: content.split("\n").length,
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
   * Search for files matching a pattern
   */
  async searchFiles(pattern: string): Promise<ToolResult> {
    try {
      const files = await glob(pattern, { cwd: this.projectRoot });
      
      return {
        success: true,
        data: {
          pattern,
          files: files.map(file => relative(this.projectRoot, file)),
          count: files.length,
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
   * Search for text content in files
   */
  async searchText(query: string, filePattern: string = "**/*.{ts,tsx,js,jsx,json,md}"): Promise<ToolResult> {
    try {
      const files = await glob(filePattern, { cwd: this.projectRoot });
      const results: Array<{ file: string; matches: Array<{ line: number; content: string }> }> = [];

      for (const file of files) {
        try {
          const content = await readFile(join(this.projectRoot, file), "utf-8");
          const lines = content.split("\n");
          const matches: Array<{ line: number; content: string }> = [];

          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(query.toLowerCase())) {
              matches.push({
                line: index + 1,
                content: line.trim(),
              });
            }
          });

          if (matches.length > 0) {
            results.push({
              file: relative(this.projectRoot, file),
              matches,
            });
          }
        } catch (fileError) {
          // Skip files that can't be read
          continue;
        }
      }

      return {
        success: true,
        data: {
          query,
          results,
          totalMatches: results.reduce((sum, result) => sum + result.matches.length, 0),
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
   * Get file information
   */
  async getFileInfo(filePath: string): Promise<ToolResult> {
    try {
      const fullPath = resolve(this.projectRoot, filePath);
      const stats = await stat(fullPath);
      
      return {
        success: true,
        data: {
          filePath,
          size: stats.size,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          modified: stats.mtime,
          created: stats.birthtime,
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
   * List directory contents
   */
  async listDirectory(dirPath: string = "."): Promise<ToolResult> {
    try {
      const fullPath = resolve(this.projectRoot, dirPath);
      const items = await readdir(fullPath);
      const detailedItems: Array<{ name: string; isFile: boolean; isDirectory: boolean; size?: number }> = [];

      for (const item of items) {
        const itemPath = join(fullPath, item);
        const stats = await stat(itemPath);
        detailedItems.push({
          name: item,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          size: stats.isFile() ? stats.size : undefined,
        });
      }

      return {
        success: true,
        data: {
          directory: dirPath,
          items: detailedItems,
          count: items.length,
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
   * Execute a command in the project directory
   */
  async executeCommand(command: string, args: string[] = []): Promise<ToolResult> {
    try {
      const result = await execa(command, args, {
        cwd: this.projectRoot,
        stdio: "pipe",
      });

      return {
        success: true,
        data: {
          command: `${command} ${args.join(" ")}`,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: {
          command: `${command} ${args.join(" ")}`,
          exitCode: (error as any).exitCode,
          stdout: (error as any).stdout,
          stderr: (error as any).stderr,
        },
      };
    }
  }

  /**
   * Get git status
   */
  async getGitStatus(): Promise<ToolResult> {
    return await this.executeCommand("git", ["status", "--porcelain"]);
  }

  /**
   * Get git log
   */
  async getGitLog(limit: number = 10): Promise<ToolResult> {
    return await this.executeCommand("git", ["log", `-${limit}`, "--oneline"]);
  }

  /**
   * Get git diff
   */
  async getGitDiff(filePath?: string): Promise<ToolResult> {
    const args = filePath ? ["diff", filePath] : ["diff"];
    return await this.executeCommand("git", args);
  }

  /**
   * Create a new file with template content
   */
  async createFileFromTemplate(
    filePath: string,
    template: string,
    variables: Record<string, string> = {}
  ): Promise<ToolResult> {
    try {
      let content = template;
      
      // Replace variables in template
      for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
      }

      return await this.writeFile(filePath, content);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Analyze code structure
   */
  async analyzeCodeStructure(filePath: string): Promise<ToolResult> {
    try {
      const result = await this.readFile(filePath);
      if (!result.success) {
        return result;
      }

      const content = result.data.content as string;
      const analysis = {
        filePath,
        totalLines: content.split("\n").length,
        imports: this.extractImports(content),
        exports: this.extractExports(content),
        functions: this.extractFunctions(content),
        classes: this.extractClasses(content),
        interfaces: this.extractInterfaces(content),
        types: this.extractTypes(content),
        comments: this.extractComments(content),
      };

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract imports from code
   */
  private extractImports(content: string): string[] {
    const importRegex = /import\s+.*?\s+from\s+["']([^"']+)["']/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Extract exports from code
   */
  private extractExports(content: string): string[] {
    const exportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    const exports: string[] = [];
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  /**
   * Extract functions from code
   */
  private extractFunctions(content: string): Array<{ name: string; line: number }> {
    const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function))/g;
    const functions: Array<{ name: string; line: number }> = [];
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1] || match[2];
      const line = content.substring(0, match.index).split("\n").length;
      functions.push({ name, line });
    }

    return functions;
  }

  /**
   * Extract classes from code
   */
  private extractClasses(content: string): Array<{ name: string; line: number }> {
    const classRegex = /class\s+(\w+)/g;
    const classes: Array<{ name: string; line: number }> = [];
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split("\n").length;
      classes.push({ name: match[1], line });
    }

    return classes;
  }

  /**
   * Extract interfaces from code
   */
  private extractInterfaces(content: string): Array<{ name: string; line: number }> {
    const interfaceRegex = /interface\s+(\w+)/g;
    const interfaces: Array<{ name: string; line: number }> = [];
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split("\n").length;
      interfaces.push({ name: match[1], line });
    }

    return interfaces;
  }

  /**
   * Extract types from code
   */
  private extractTypes(content: string): Array<{ name: string; line: number }> {
    const typeRegex = /type\s+(\w+)/g;
    const types: Array<{ name: string; line: number }> = [];
    let match;

    while ((match = typeRegex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split("\n").length;
      types.push({ name: match[1], line });
    }

    return types;
  }

  /**
   * Extract comments from code
   */
  private extractComments(content: string): Array<{ type: "line" | "block"; content: string; line: number }> {
    const comments: Array<{ type: "line" | "block"; content: string; line: number }> = [];
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//")) {
        comments.push({
          type: "line",
          content: trimmed.substring(2).trim(),
          line: index + 1,
        });
      } else if (trimmed.startsWith("/*")) {
        comments.push({
          type: "block",
          content: trimmed.substring(2).trim(),
          line: index + 1,
        });
      }
    });

    return comments;
  }
}
