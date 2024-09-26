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
const configJson = require('./config.json');

function handleConfig() {
  let VALID_FILE_EXTENSIONS = []
  let VALID_FILE_EXTENSIONS_MAPPING = {}

  for (const extension of configJson.validFileExtensions) {
    const parsedExtension = `.${extension}`

    VALID_FILE_EXTENSIONS.push(parsedExtension)
    VALID_FILE_EXTENSIONS_MAPPING[extension] = parsedExtension
  }

  const TARGET_ARG = '--target'
  const FROM_ARG = '--from'
  const TO_ARG = '--to'

  const VALID_ARGS = [TARGET_ARG, FROM_ARG, TO_ARG]

  return {
    VALID_FILE_EXTENSIONS,
    VALID_FILE_EXTENSIONS_MAPPING,
    TARGET_ARG,
    FROM_ARG,
    TO_ARG,
    VALID_ARGS,
  }
}
const {
  VALID_ARGS,
  FROM_ARG,
  TO_ARG,
  TARGET_ARG,
  VALID_FILE_EXTENSIONS,
  VALID_FILE_EXTENSIONS_MAPPING,
} = handleConfig()
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

  console.log(args)

  // process.exit(0)

  let target = ''
  let from = []
  let to = ''

  for (const arg of args) {
    const isValid = !!VALID_ARGS.find((el) => arg.startsWith(el))

    if (!isValid) {
      console.log('\nERRO --- PARAMETRO INVALIDO RECEBIDO\n')
      process.exit(1)
    }

    const [key, value] = arg.split('=')

    if (key === TARGET_ARG) {
      let parsedValue = value
      if (
        (value[0] === "\"" || value[0] === "'") &&
        (value[value.length - 1] === "\"" || value[value.length - 1] === "'")
      ) {
        parsedValue = value.slice(1, value.length - 1)
      }

      const targetExists = await verifyIfTargetExists(parsedValue)

      if (!targetExists) {
        console.log('\nERRO --- O DIRETORIO ALVO NAO FOI ENCONTRADO\n')
        process.exit(1)
      }
      target = parsedValue
    }

    if (key === FROM_ARG) {
      const fromValues = value.split(',')

      if (!value) {
        from = VALID_FILE_EXTENSIONS
      } else {
        const hasInvalidFromValue = fromValues.find((fromValue) => {
          return !VALID_FILE_EXTENSIONS.includes(VALID_FILE_EXTENSIONS_MAPPING[fromValue])
        })

        if (hasInvalidFromValue) {
          console.log('\nERRO --- O PARAMETRO "--from" ESTA INVALIDO\n')
          process.exit(1)
        }

        from = value.split(',')
      }
    }

    if (key === TO_ARG) {
      const isValid = VALID_FILE_EXTENSIONS.includes(VALID_FILE_EXTENSIONS_MAPPING[value])

      if (!isValid) {
        console.log('\nERRO --- O PARAMETRO "--to" ESTA INVALIDO\n')
        process.exit(1)
      }

      to = value
    }
  }

  if (!target || !from.length || !to) {
    console.log('\nERRO --- TODOS OS PARAMETROS SAO OBRIGATORIOS\n')
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

  if (!filepaths.length) {
    console.log(
      `Nenhum arquivo ${from.length > 1 ? "do" : "dos"
      } ${from.length > 1 ? "tipo" : "tipos"
      } ${from.length > 1 ? "do" : "dos"
      } ${from.join(',')} foram encontrados no diretorio ${target}.`
    )
    process.exit(0)
  }

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