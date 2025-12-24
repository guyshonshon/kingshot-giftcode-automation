// Script to convert Netlify functions to Vercel format
const fs = require('fs')
const path = require('path')

const apiDir = path.join(__dirname, 'api')
const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.js') && f !== '_vercel-wrapper.js' && !f.includes('utils'))

files.forEach(file => {
  const filePath = path.join(apiDir, file)
  let content = fs.readFileSync(filePath, 'utf8')
  
  // Check if already converted
  if (content.includes('createVercelHandler')) {
    console.log(`✓ ${file} already converted`)
    return
  }
  
  // Find exports.handler
  if (content.includes('exports.handler = async (event, context) =>')) {
    // Replace with handler function + exports
    content = content.replace(
      /exports\.handler = async \(event, context\) =>/g,
      '// Netlify handler\nconst handler = async (event, context) =>'
    )
    
    // Add exports at the end (before last closing brace)
    const lastBrace = content.lastIndexOf('}')
    if (lastBrace > 0) {
      const before = content.substring(0, lastBrace)
      const after = content.substring(lastBrace)
      
      const exportCode = `\n}\n\n// Export for both Netlify and Vercel\nexports.handler = handler\n\n// Vercel format\nconst { createVercelHandler } = require('./_vercel-wrapper')\nmodule.exports = createVercelHandler(handler)`
      
      content = before + exportCode + after
    }
    
    fs.writeFileSync(filePath, content)
    console.log(`✓ Converted ${file}`)
  } else {
    console.log(`⚠ ${file} - no handler found or already in different format`)
  }
})

console.log('\n✅ Conversion complete!')

