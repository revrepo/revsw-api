Миграция MongoDB 2.4 to 3.6
---------------------------

1. Создание dump баз(ы) данных версии 2.4 с использованием `mongodump` на remote host
```bash
$ssh nikolay@TESTSJC20-CMDB01.REVSW.NET
$sudo -i
$cd /home/nikolay
$mongodump 
```
2. Создание taz.zg архива для скачивания 

```bash 
$tar -C dump/ -cvzf "dump.tar.gz" .
```

3. Копирование с удаленного сервера в локальную директорию

```bash
$cd [mongo_upgrade]
$scp nikolay@TESTSJC20-CMDB01.REVSW.NET:/home/nikolay/dump.tar.gz ./data
```

4. Распаковать tar.gz в /data/dump

5. Выполнить скрип миграции данных по основным версия Mongodb 

```bash
$source mongodb_upgrade.sh
```

В результате успешного выполнения скрипта будет сформирована директория /data/dump_3_6_3 с dump БД
Также локально будет запушен docker container с mongodb 3.6.3