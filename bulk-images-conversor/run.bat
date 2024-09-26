@ECHO off
ECHO ---------------------------------
ECHO ^| CONVERSOR DE IMAGENS EM MASSA ^|
ECHO ---------------------------------
ECHO.
ECHO Para realizar a conversao e preciso preencher algumas informacoes:
ECHO.
PAUSE
ECHO .
ECHO .
ECHO .
ECHO Primeiro insira abaixo o caminho da pasta onde estao as imagens que voce quer converter.
ECHO.
ECHO Esse caminho voce consegue da seguinte forma:
ECHO.
ECHO   1 - Clique com o BOTAO DIREITO do mouse sobre a pasta;
ECHO   2 - Na lista que abriu apos o primeiro clique, procure a opcao "copiar como caminho" e clique nela;
ECHO   3 - Apos isso o caminho da pasta ja estara disponivel na funcao "colar" do seu computador. Voce pode "colar" o caminho pressionando em conjunto as teclas "Ctrl V" do seu teclado;
ECHO.
SET /p caminho_da_pasta=Cole aqui o caminho da pasta: 
ECHO .
ECHO .
ECHO .
ECHO Agora me diga qual os tipos de arquivo da pasta que voce me passou que devem ser convertidos. 
ECHO.
ECHO Os tipos do arquivo sao aquelas siglas que ficam no final dos nomes dos arquivos, por exemplo "foto-1.jpg", "foto-2.webp", "foto-3.png", etc.
ECHO.
ECHO Insira abaixo todos os tipos de arquivos que estao presentes na pasta e que devem ser convertidos para o formato desejado.
ECHO.
ECHO Caso vá inserir mais de um, divida eles por virgula e sem espacos, exemplo: jpg,png,webp,heic
ECHO.
ECHO Caso nenhum formato seja informado, TODOS OS TIPOS DE ARQUIVOS VALIDOS PARA IMAGENS SERAO UTILIZADOS.
ECHO.
SET /p tipos_de_arquivos_da_pasta=Insira aqui os formatos que devem ser convertidos: 
ECHO .
ECHO .
ECHO .
ECHO Agora, insira o formato para o qual todas as imagens serao convertidas. Esse campo aceita APENAS UM FORMATO.
ECHO.
SET /p formato_de_conversao=para o qual todas as imagens serao convertidas: 
ECHO .
ECHO .
ECHO .
ECHO ---------------START---------------
ECHO O programa de conversao esta sendo iniciado...
ECHO O processo pode demorar alguns minutos ate acabar de converter tudo dependendo da quantidade de imagens na pasta.
ECHO.
ECHO.
ECHO.
ECHO !!!NAO FECHE ESSA JANELA SENAO O PROCESSO DE CONVERSAO SERA INTERROMPIDO IMEDIATAMENTE!!!
ECHO.
ECHO.
ECHO.

node src/index.js --target=""%caminho_da_pasta%"" --from=""%tipos_de_arquivos_da_pasta%"" --to=""%formato_de_conversao%""

ECHO.
ECHO ----------------END----------------
PAUSE