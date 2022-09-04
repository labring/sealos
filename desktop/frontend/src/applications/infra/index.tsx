import { Label,SpinButton,SpinButtonProps, RadioGroup,Radio,Checkbox } from '@fluentui/react-components';
import axios from 'axios';
import type { NextPage } from 'next';
import * as React from 'react';
import useSessionStore from '../../stores/session';

const Infra: NextPage = () => {
    var [masterType,setMasterType] = React.useState('');
    var [nodeType,setNodeType] = React.useState('');
    const [imageOption1, setImageOption1] = React.useState(true);
    const [imageOption2, setImageOption2] = React.useState(true);
    var [image1, setImage1] = React.useState('labring/kubernetes:v1.24.0');
    var [image2, setImage2] = React.useState('labring/calico:v3.24.1');
    var [masterCount, setMasterCountValue] = React.useState<number | null>(1);
    var [nodeCount, setNodeCountValue] = React.useState<number | null>(1);
    const session = useSessionStore((s) => s.session);

    function handleClick() {
        axios.post("/api/infra/awsapply",{
            "masterType":masterType,
            "masterCount":masterCount,
            "nodeType":nodeType,
            "nodeCount":nodeCount,
            "images":{image1,image2},
            "kubeconfig": session.kubeconfig
        }).then((res) => {
            console.log(res.data)
        })
    }
    function handleGetClick() {
        axios.post("/api/infra/awsget",{
            "infra_name": "huruizhe-3",
            "kubeconfig": session.kubeconfig
        }).then((res) => {
            console.log(res.data)
        })
    }
    const onMasterCountChange: SpinButtonProps['onChange'] =(_ev, data) => {
        if (data.value !== undefined) {
            setMasterCountValue(data.value);
        } else if (data.displayValue !== undefined) {
            const newValue = parseFloat(data.displayValue);
            if (!Number.isNaN(newValue)) {
                setMasterCountValue(newValue);
            } else {
                console.error(`Cannot parse "${data.displayValue}" as a number.`);
            }
        }
    }

    const onNodeCountChange: SpinButtonProps['onChange'] = (_ev, data) => {
        if (data.value !== undefined) {
            setNodeCountValue(data.value);
        } else if (data.displayValue !== undefined) {
            const newValue = parseFloat(data.displayValue);
            if (!Number.isNaN(newValue)) {
                setNodeCountValue(newValue);
            } else {
                console.error(`Cannot parse "${data.displayValue}" as a number.`);
            }
        }
    }

    return (
        <div>
            <p>
            </p>
            <Label id="masterType">EC2 master type:</Label>
            <RadioGroup layout="horizontal" aria-labelledby="masterType" onChange={(_ev, data) => {setMasterType(data.value)}}>
                <Radio value="t2.medium" label="2核 4G" />
                <Radio value="t2.large"  label="2核 8G"/>
                <Radio value="t2.xlarge" label="4核 16G" />
            </RadioGroup>
            <p>
            </p>
            <Label htmlFor="EC2 master count">
                EC2 master count:
            </Label>
            <SpinButton value={masterCount} min={0} max={9} id="EC2 master count" onChange={onMasterCountChange} />min: 0, max: 9
            <p>
            </p>
            <Label id="nodeType">EC2 node type:</Label>
            <RadioGroup layout="horizontal" aria-labelledby="nodeType" onChange={(_ev, data) => {setNodeType(data.value)}}>
                <Radio value="t2.medium" label="2核 4G" />
                <Radio value="t2.large"  label="2核 8G"/>
                <Radio value="t2.xlarge" label="4核 16G" />
            </RadioGroup>
            <p />
            <Label htmlFor="EC2 node count">
                EC2 node count:
            </Label>
            <SpinButton value={nodeCount} min={0} max={9} id="EC2 node count" onChange={onNodeCountChange} />min: 0, max: 9
            <p />
            Images:
            <Checkbox checked={imageOption1} onChange={(_ev,data) => {
                setImageOption1(checked => !checked);
                if(data.checked){
                    setImage1("labring/kubernetes:v1.24.0")
                }else{
                    setImage1("")
                }
            }} label="labring/kubernetes:v1.24.0"
            />
            <Checkbox checked={imageOption2} onChange={(_ev,data) => {
                setImageOption2(checked => !checked);
                if(data.checked){
                    setImage2("labring/calico:v3.24.1")
                }else{
                    setImage2("")
                }
            }} label="labring/calico:v3.24.1"
            />
            <p />
            <a href="#" onClick={handleClick}>
                Start
            </a>
            <p />
            <a href="#" onClick={handleGetClick}>
                Get
            </a>
            <p>
                cluster.yaml:
                <br />
                apiVersion: infra.sealos.io/v1 <br />
                kind: Infra <br />
                spec: <br />
                &emsp;hosts: <br />
                &emsp;-&ensp; roles: [master]<br />
                &emsp;&emsp;count: {masterCount}<br />
                &emsp;&emsp;flavor: {masterType}<br />
                &emsp;-&ensp; roles: [node]<br />
                &emsp;&emsp;count: {nodeCount}<br />
                &emsp;&emsp;flavor: {nodeType}<br />
                ---
                <br />
                apiVersion: cluster.sealos.io/v1 <br />
                kind: Cluster <br />
                spec: <br />
                &emsp;infra: <br />
                &emsp;images: <br />
                {image1 !== "" && <>&emsp;-&ensp; {image1} <br /></> }
                {image2 !== "" && <>&emsp;-&ensp; {image2} <br /></> }
            </p>
        </div>
    )
}

export default Infra