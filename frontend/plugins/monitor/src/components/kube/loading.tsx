import { Box, Flex, Spinner } from "@chakra-ui/react";

export const LoadingPage = () => {
  return (
    <Flex flexFlow="column wrap" justify={"center"} align={"center"} h="100vh">
      <Box>Loading...</Box>
      <Spinner
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color="blue.500"
        size="xl"
      />
    </Flex>
  );
};
