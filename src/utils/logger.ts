const logger = {
  info: (message: string, meta?: any) => {
    if (meta && Object.keys(meta).length > 0) {
      console.log(message, meta);
    } else {
      console.log(message);
    }
  },
  
  warn: (message: string, meta?: any) => {
    if (meta && Object.keys(meta).length > 0) {
      console.warn(message, meta);
    } else {
      console.warn(message);
    }
  },
  
  error: (message: string, meta?: any) => {
    if (meta && Object.keys(meta).length > 0) {
      console.error(message, meta);
    } else {
      console.error(message);
    }
  },

  section: (title: string) => {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${title}`);
    console.log('='.repeat(60));
  },

  subsection: (title: string) => {
    console.log('\n' + '-'.repeat(60));
    console.log(`  ${title}`);
    console.log('-'.repeat(60));
  },

  success: (message: string, meta?: any) => {
    if (meta && Object.keys(meta).length > 0) {
      console.log(`✅ ${message}`, meta);
    } else {
      console.log(`✅ ${message}`);
    }
  },

  progress: (message: string, meta?: any) => {
    if (meta && Object.keys(meta).length > 0) {
      console.log(`⏳ ${message}`, meta);
    } else {
      console.log(`⏳ ${message}`);
    }
  },

  alert: (message: string, meta?: any) => {
    if (meta && Object.keys(meta).length > 0) {
      console.warn(`🚨 ${message}`, meta);
    } else {
      console.warn(`🚨 ${message}`);
    }
  },

  debug: (message: string, meta?: any) => {
    if (process.env.LOG_LEVEL === 'debug') {
      if (meta && Object.keys(meta).length > 0) {
        console.log(`🔍 ${message}`, meta);
      } else {
        console.log(`🔍 ${message}`);
      }
    }
  }
};

export default logger;