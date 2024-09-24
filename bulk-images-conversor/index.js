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
// const configJson = require('./config.json');

const TARGET_ARG = '--target'
const FROM_ARG = '--from'
const TO_ARG = '--to'

const VALID_ARGS = [TARGET_ARG, FROM_ARG, TO_ARG]

const VALID_FILE_EXTENSIONS = ['.jpeg', '.jpg', '.png', '.HEIC', '.gif', '.webp', '.bmp', '.svg', '.tiff']
const VALID_FILE_EXTENSIONS_MAPPING = {
  jpeg: '.jpeg',
  jpg: '.jpg',
  png: '.png',
  HEIC: '.HEIC',
  gif: '.gif',
  webp: '.webp',
  bmp: '.bmp',
  svg: '.svg',
  tiff: '.tiff',
}
// const CONFIG_JSON = configJson

/**
 * @param {string} targetPath 
 */
async function verifyIfTargetExists(targetPath) {
  try {
    const stat = await fs.stat(targetPath)

    return true

  } catch (err) {
    return false
  }
}

/**
 * @param {string} path 
 * @param {string[]} targetFileExtensions
 * 
 * @returns {Promise<string[]>}
 */
async function listarArquivos(dirPath, targetFileExtensions) {
  const result = await fs.readdir(dirPath)

  let data = []

  for (const filepath of result) {
    const fullFilepath = path.join(dirPath, filepath)

    const stat = await fs.stat(fullFilepath)

    if (stat.isDirectory()) {
      const recursionResult = await listarArquivos(fullFilepath, targetFileExtensions)
      data = data.concat(recursionResult)

      continue
    }

    const fileExtensionParts = path.extname(filepath).split('.')

    const fileExtension = fileExtensionParts[fileExtensionParts.length - 1]

    if (!targetFileExtensions.includes(fileExtension)) {
      continue
    }

    const parsedPath = path.join(dirPath, filepath)

    data.push(parsedPath)
  }

  return data
}

async function validateAndParseArgs() {
  const [
    _nodejs_executable_path,
    _nodejs_program_entryfile_path,
    ...args
  ] = process.argv

  let target = ''
  let from = []
  let to = ''

  for (const arg of args) {
    const isValid = !!VALID_ARGS.find((el) => arg.startsWith(el))

    if (!isValid) {
      console.log('\nERRO --- PARÂMETRO INVÁLIDO RECEBIDO\n')
      process.exit(1)
    }

    const [key, value] = arg.split('=')

    if (!value) {
      console.log('\nERRO --- TODOS OS PARÂMETROS DEVEM RECEBER UM VALOR\n')
      process.exit(1)
    }

    if (key === TARGET_ARG) {
      const targetExists = await verifyIfTargetExists(value)

      if (!targetExists) {
        console.log('\nERRO --- O DIRETÓRIO ALVO NÃO FOI ENCONTRADO\n')
        process.exit(1)
      }
      target = value
    }

    if (key === FROM_ARG) {
      const fromValues = value.split(',')

      const hasInvalidFromValue = fromValues.find((fromValue) => {
        return !VALID_FILE_EXTENSIONS.includes(VALID_FILE_EXTENSIONS_MAPPING[fromValue])
      })

      if (hasInvalidFromValue) {
        console.log('\nERRO --- O PARÂMETRO "--from" ESTÁ INVÁLIDO\n')
        process.exit(1)
      }

      from = value.split(',')
    }

    if (key === TO_ARG) {
      const isValid = VALID_FILE_EXTENSIONS.includes(VALID_FILE_EXTENSIONS_MAPPING[value])

      if (!isValid) {
        console.log('\nERRO --- O PARÂMETRO "--to" ESTÁ INVÁLIDO\n')
        process.exit(1)
      }

      to = value
    }
  }

  if (!target || !from || !to) {
    console.log('\nERRO --- TODOS OS PARÂMETROS SÃO OBRIGATÓRIOS\n')
    process.exit(1)
  }

  return {
    target,
    from,
    to,
  }
}

async function main() {
  const {
    from,
    target,
    to,
  } = await validateAndParseArgs()

  const parsedTargetDir = path.resolve(target)

  const targetDirName = path.parse(parsedTargetDir).name

  const fileExtensionTypeTarget = VALID_FILE_EXTENSIONS_MAPPING[to]

  const targetDirFatherDir = path.dirname(parsedTargetDir)

  const resultsDirName =
    `${targetDirName}-${from.join('_')}-to-${to}-${new Date().toISOString().replace(/[.: ]+/g, '-')}-${crypto.randomUUID()}`

  const resultsRootDirFilePath = path.join(
    targetDirFatherDir,
    resultsDirName
  )

  const stat = await fs.stat(parsedTargetDir)


  if (!stat.isDirectory()) {
    console.log('ERRO')
    return
  }

  const filepaths = await listarArquivos(parsedTargetDir, from)

  const commandPaths = []

  for (const filepath of filepaths) {
    const {
      dir: fatherDir,
      name,
    } = path.parse(filepath)

    const endSectionOfcurrentTargetFilepath = fatherDir.slice(parsedTargetDir.length)

    const newFileName = `${name}${fileExtensionTypeTarget}`
    const fullNewPath =
      path.join(resultsRootDirFilePath, endSectionOfcurrentTargetFilepath, newFileName)

    commandPaths.push([filepath, fullNewPath])
  }

  const commands = []

  for (const paths of commandPaths) {
    const newFilepathParts = paths[1].split(path.sep)

    let remountedFullPath = ""
    for (const pathPart in newFilepathParts) {
      if (!remountedFullPath) {
        remountedFullPath = newFilepathParts[pathPart]
      } else {
        remountedFullPath = path.join(remountedFullPath, newFilepathParts[pathPart])
      }

      if (Number(pathPart) === newFilepathParts.length - 1) {
        break
      }

      try {
        await fs.stat(remountedFullPath)
      } catch (err) {
        await fs.mkdir(remountedFullPath, { recursive: true })
      }
    }

    const command = `magick "${paths[0]}" "${paths[1]}"`

    commands.push(command)
  }

  // TODO: Implementar paralelismo
  for (const command in commands) {
    console.log(`Executing conversion ${Number(command) + 1} of ${commands.length}`)
    childProcess.execSync(commands[command])
  }
}

main()

// node index.js --target=INVALID --from=INVALID --to=INVALID --outdir=INVALID