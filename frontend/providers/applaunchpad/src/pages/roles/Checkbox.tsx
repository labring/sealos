import { Checkbox, Stack } from '@chakra-ui/react'
import React, { useMemo } from 'react'

export function DefineCheckBox({ list, value, onChange }: { list: any[], value: any[], onChange: any }) {
    const allChecked = useMemo(() => {
        console.log(value,list)
        if (value.length > 0 && value.length === list.length) return true
        return false
    }, [list, value])
    const isIndeterminate = useMemo(() => {
        if (value.length > 0 && value.length < list.length) return true
        return false
    }, [list, value])
    const [innerValueMap,setInnerValueMap] = React.useState<any>({})
    return (
        <div>
            <Checkbox
                isChecked={allChecked}
                isIndeterminate={isIndeterminate}
                key={'all'}
                name='all'
                onChange={(e) => {
                    if (!allChecked) {
                        let _selected: string[] = []
                        let _mapping:any = {}
                        list.forEach((item) => {
                            _mapping[item.name] = true
                            _selected.push(item.name)
                        })
                        onChange(_selected)
                        setInnerValueMap(_mapping)
                    } else {
                        onChange([])
                        setInnerValueMap({})
                    }
                }}
            >
                全选
            </Checkbox>
            <>
                {list.map((item) => {
                    return <div key={item.name}>
                        <Checkbox
                            key={item.name}
                            isChecked={innerValueMap[item.name]}
                            value={innerValueMap[item.name]}
                            name={item.name}
                            onChange={(e) => {
                                const findIndex = value.findIndex((name) => {
                                    return name == item.name
                                })
                                let _mapping:any = {...innerValueMap}
                                const _value = value.slice()
                                if (_mapping[item.name] && findIndex !=-1) {
                                    _value.splice(findIndex, 1)
                                    onChange(_value)
                                    _mapping[item.name] = false
                                } else {
                                    _value.push(item.name)
                                    _mapping[item.name] = true
                                    onChange(_value)
                                }
                                setInnerValueMap(_mapping)
                            }}
                        >
                            {item.name}
                        </Checkbox>
                    </div>
                })}
                {/* <Checkbox
          isChecked={checkedItems[1]}
          onChange={(e) => setCheckedItems([checkedItems[0], e.target.checked])}
        >
          Child Checkbox 2
        </Checkbox> */}
            </>
        </div>
    )
}