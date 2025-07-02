import { Checkbox, Stack } from '@chakra-ui/react'
import React, { useEffect, useMemo } from 'react'

export function DefineCheckBox({ list, value, onChange }: { list: any[], value: any[], onChange: any }) {
    const allChecked = useMemo(() => {
        if (value.length > 0 && value.length === list.length) return true
        return false
    }, [list, value])
    const isIndeterminate = useMemo(() => {
        if (value.length > 0 && value.length < list.length) return true
        return false
    }, [list, value])
    const [innerValueMap,setInnerValueMap] = React.useState<any>({})
    useEffect(()=>{
        const _innerValueMap = {...innerValueMap}
        value?.map((key)=>{
            _innerValueMap[key] = key
        })
        setInnerValueMap(_innerValueMap)
    },[value])
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
                            _mapping[item.id] = true
                            _selected.push(item.id)
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
                    return <div key={item.id}>
                        <Checkbox
                            key={item.id}
                            isChecked={innerValueMap[item.id]}
                            value={innerValueMap[item.id]}
                            name={item.id}
                            onChange={(e) => {
                                const findIndex = value.findIndex((name) => {
                                    return name == item.id
                                })
                                let _mapping:any = {...innerValueMap}
                                const _value = value.slice()
                                if (_mapping[item.id] && findIndex !=-1) {
                                    _value.splice(findIndex, 1)
                                    onChange(_value)
                                    _mapping[item.id] = false
                                } else {
                                    _value.push(item.id)
                                    _mapping[item.id] = true
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