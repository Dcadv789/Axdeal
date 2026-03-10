/**
 * Logger Utility - Sistema AXDeal
 * 
 * Utilitário centralizado para logs do sistema.
 * Em produção, apenas erros são logados.
 * Em desenvolvimento, todos os logs são exibidos.
 */

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

interface LogOptions {
  component?: string;
  action?: string;
  data?: any;
}

class Logger {
  /**
   * Log informativo (apenas em desenvolvimento)
   */
  log(message: string, options?: LogOptions) {
    if (isDev) {
      const prefix = this.formatPrefix(options);
      console.log(`${prefix}${message}`, options?.data || '');
    }
  }

  /**
   * Log de aviso (apenas em desenvolvimento)
   */
  warn(message: string, options?: LogOptions) {
    if (isDev) {
      const prefix = this.formatPrefix(options);
      console.warn(`${prefix}${message}`, options?.data || '');
    }
  }

  /**
   * Log de erro (sempre exibido, mesmo em produção)
   */
  error(message: string, error?: any, options?: LogOptions) {
    const prefix = this.formatPrefix(options);
    console.error(`${prefix}${message}`, error || '');
    
    // Em produção, você pode enviar para um serviço de monitoramento
    if (isProd) {
      this.sendToMonitoring(message, error, options);
    }
  }

  /**
   * Log de sucesso (apenas em desenvolvimento)
   */
  success(message: string, options?: LogOptions) {
    if (isDev) {
      const prefix = this.formatPrefix(options);
      console.log(`✅ ${prefix}${message}`, options?.data || '');
    }
  }

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(message: string, data?: any) {
    if (isDev) {
      console.log(`🔍 [DEBUG] ${message}`, data || '');
    }
  }

  /**
   * Formata o prefixo do log
   */
  private formatPrefix(options?: LogOptions): string {
    if (!options) return '';
    
    const parts: string[] = [];
    
    if (options.component) {
      parts.push(`[${options.component}]`);
    }
    
    if (options.action) {
      parts.push(`[${options.action}]`);
    }
    
    return parts.length > 0 ? `${parts.join(' ')} ` : '';
  }

  /**
   * Envia erro para serviço de monitoramento (Sentry, LogRocket, etc)
   */
  private sendToMonitoring(message: string, error?: any, options?: LogOptions) {
    // TODO: Implementar integração com serviço de monitoramento
    // Exemplo: Sentry.captureException(error, { extra: { message, ...options } });
  }

  /**
   * Agrupa logs relacionados
   */
  group(label: string, callback: () => void) {
    if (isDev) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Mede o tempo de execução de uma função
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (isDev) {
      console.time(label);
    }
    
    try {
      const result = await fn();
      
      if (isDev) {
        console.timeEnd(label);
      }
      
      return result;
    } catch (error) {
      if (isDev) {
        console.timeEnd(label);
      }
      throw error;
    }
  }

  /**
   * Log de tabela (apenas em desenvolvimento)
   */
  table(data: any[], label?: string) {
    if (isDev) {
      if (label) {
        console.log(label);
      }
      console.table(data);
    }
  }
}

// Exportar instância única
export const logger = new Logger();

// Exportar também para compatibilidade
export default logger;





