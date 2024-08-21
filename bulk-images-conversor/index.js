/**
 * 
 * 
 * 
 * IMPORTS AND GLOBAL VARS DEFINITION
 * 
 * 
 * 
 */

const fs = require('node:fs/promises')
const path = require('node:path')
const process = require('node:process')
const crypto = require('node:crypto')
const childProcess = require('node:child_process');

const VALID_FILE_EXTENSIONS = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff']

const TARGET_ARG = '--target'
const FROM_ARG = '--from'
const TO_ARG = '--to'
// const OUTDIR_ARG =  '--outdir'

const VALID_ARGS = [TARGET_ARG, FROM_ARG, TO_ARG]
// const VALID_ARGS = [TARGET_ARG, FROM_ARG, TO_ARG, OUTDIR_ARG]

/**
 * @typedef {{ parent: string, path: string }} FilepathItem
 * @typedef {{ [key: string]: { data: string[] } }} ParsedFilepathsData
 */

/**
 * 
 * 
 * 
 * PROGRAM
 * 
 * 
 * 
 */

/**
 * @param {string} targetPath 
 */
async function targetExists(targetPath) {
  try {
    const stat = await fs.stat(targetPath)

    console.log(stat)

    return true

  } catch (err) {
    return false
  }
}

function validateAndParseArgs() {
  const [
    _nodejs_executable_path,
    _nodejs_program_entryfile_path,
    ...args
  ] = process.argv

  let target = ''
  let from = []
  let to = ''
  // let outdir = ''

  for (const arg of args) {
    const isValid = !!VALID_ARGS.find((el) => arg.startsWith(el))

    if (!isValid) {
      console.log('\nERRO - PARÂMETRO INVÁLIDO RECEBIDO\n')
      process.exit(1)
    }

    const [key, value] = arg.split('=')

    if (!value) {
      console.log('\nERRO - TODOS OS PARÂMETROS DEVEM RECEBER UM VALOR\n')
      process.exit(1)
    }

    if (key === TARGET_ARG) {
      targetExists(value)
      target = value
    }
    if (key === FROM_ARG) {
      const fromValues = value.split(',')

      const hasInvalidFromValue = fromValues.find((fromValue) => !VALID_FILE_EXTENSIONS.includes(fromValue))

      if (hasInvalidFromValue) {
        console.log('\nERRO --- O PARÂMETRO "--from" ESTÁ INVÁLIDO\n')
        process.exit(1)
      }

      from = value.split(',')
    }
    if (key === TO_ARG) {
      if (!VALID_FILE_EXTENSIONS.includes(value)) {
        console.log('\nERRO --- O PARÂMETRO "--to" ESTÁ INVÁLIDO\n')
        process.exit(1)
      }

      to = value
    }
    // if (key === OUTDIR_ARG) {
    //   outdir = value
    // }
  }

  if (!target || !from || !to) {
    console.log('\nERRO --- TODOS OS PARÂMETROS SÃO OBRIGATÓRIOS\n')
    process.exit(1)
  }

  return {
    target,
    from,
    to,
    // outdir,
  }
}

/**
 * @param {string} path 
 * @param {string[]} targetFileExtensions
 * 
 * @returns {Promise<FilepathItem[]>}
 */
async function listarArquivos(dirPath, targetFileExtensions) {
  const result = await fs.readdir(dirPath)

  let data = []

  for (const filepath of result) {
    const fullFilepath = path.join(dirPath, filepath)

    const stat = await fs.stat(fullFilepath)

    if (stat.isDirectory()) {
      data = [...data, ...await listarArquivos(fullFilepath, targetFileExtensions)]

      continue
    }

    const filepathParts = filepath.split('.')

    if (!filepathParts.length) {
      continue
    }

    const lastFilepathPart = filepathParts[filepathParts.length - 1]

    if (!targetFileExtensions.includes(lastFilepathPart)) {
      continue
    }

    data.push({
      parent: dirPath,
      path: filepath,
    })
  }

  return data
}

/**
 * @param {FilepathItem[]} filepathsArr 
 * @returns 
 */
function parseArquivosRawData(filepathsArr) {
  /** @type {ParsedFilepathsData} */
  const parsedResult = {}

  for (const item of filepathsArr) {
    if (parsedResult[item.parent]) {
      parsedResult[item.parent].data.push(item.path)
      continue
    }

    parsedResult[item.parent] = {
      data: [item.path]
    }
  }

  return parsedResult
}

async function main() {
  const {
    target,
    from,
    to,
  } = validateAndParseArgs()

  const result = await listarArquivos(target, from)
  const parsedResult = parseArquivosRawData(result)




  const outDirName =
    `conversion-${from.join('-')}-${to}-${new Date().toISOString().replace(/.:/g, '-')}-${crypto.randomUUID()}`

  const outDirPath = path.join(target, outDirName)

  await fs.mkdir(outDirPath)

  console.log(`${result.length} files prepared to be converted`)

  let i = 1
  for (const key in parsedResult) {
    for (const filepath of parsedResult[key].data) {
      console.log(`converting file number: ${i}`)

      const fullpath = path.join(key, filepath)

      const filepathParts = filepath.split('.')
      filepathParts.splice(filepathParts.length - 1, 1)
      filepathParts.push(to)

      const fullNewPath = path.join(outDirPath, filepathParts.join('.'))

      const command = `magick "${fullpath}" "${fullNewPath}"`

      // console.log(command)
      // console.log()

      childProcess.execSync(command)
      i++
    }
  }

  console.log(`conversions finalized!`)
  process.exit(0)
}

main()

// node index.js --target=INVALID --from=INVALID --to=INVALID --outdir=INVALID