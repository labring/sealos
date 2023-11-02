import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel
} from '@chakra-ui/react';
import { Key } from 'react';

export type KubeAccordionItem = {
  key?: Key | null;
  hidden?: boolean;
  title: React.ReactNode;
  content: React.ReactNode;
};

export type KubeAccordionProps = {
  items: Array<KubeAccordionItem>;
};
export const KubeAccordion = ({ items }: KubeAccordionProps) => {
  return (
    <Accordion allowMultiple>
      {items.map(
        ({ key, title, content, hidden = false }) =>
          hidden || (
            <AccordionItem key={key}>
              <AccordionButton>
                {title}
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel pb={4}>{content}</AccordionPanel>
            </AccordionItem>
          )
      )}
    </Accordion>
  );
};
