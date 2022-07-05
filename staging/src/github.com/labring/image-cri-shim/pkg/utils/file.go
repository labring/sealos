/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package utils

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"

	"k8s.io/apimachinery/pkg/util/json"
)

func IsExist(fileName string) bool {
	if _, err := os.Stat(fileName); err != nil {
		return os.IsExist(err)
	}
	return true
}

func GetFiles(path string) (paths []string, err error) {
	_, err = os.Stat(path)
	if err != nil {
		return
	}
	err = filepath.Walk(path, func(path string, info os.FileInfo, err error) error {
		if info.IsDir() {
			return nil
		}
		paths = append(paths, path)
		return err
	})
	return paths, err
}
func ReadLines(fileName string) ([]string, error) {
	var lines []string
	if !IsExist(fileName) {
		return nil, errors.New("no such file")
	}
	file, err := os.Open(filepath.Clean(fileName))
	if err != nil {
		return nil, err
	}
	defer file.Close()
	br := bufio.NewReader(file)
	for {
		line, _, c := br.ReadLine()
		if c == io.EOF {
			break
		}
		lines = append(lines, string(line))
	}
	return lines, nil
}

func RemoveDuplicate(list []string) []string {
	var result []string
	flagMap := map[string]struct{}{}
	for _, v := range list {
		if _, ok := flagMap[v]; !ok {
			flagMap[v] = struct{}{}
			result = append(result, v)
		}
	}
	return result
}

func Unmarshal(path string) (map[string]interface{}, error) {
	metadata, err := ReadAll(path)
	if err != nil {
		return nil, err
	}
	var data map[string]interface{}
	err = json.Unmarshal(metadata, &data)
	if err != nil {
		return nil, err
	}
	return data, nil
}

// ReadAll read file content
func ReadAll(fileName string) ([]byte, error) {
	// step1：check file exist
	if !IsExist(fileName) {
		return nil, fmt.Errorf("path is %s no such file", fileName)
	}
	// step2：open file
	file, err := os.Open(filepath.Clean(fileName))
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// step3：read file content
	content, err := ioutil.ReadFile(filepath.Clean(fileName))
	if err != nil {
		return nil, err
	}

	return content, nil
}

func NotIn(key string, slice []string) bool {
	for _, s := range slice {
		if key == s {
			return false
		}
	}
	return true
}
