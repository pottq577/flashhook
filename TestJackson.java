import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;

public class TestJackson {
    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        String json = "{\"type\":\"url_verification\",\"challenge\":\"abcXYZ\"}";
        JsonNode root = mapper.readTree(json);
        System.out.println("Has type: " + root.has("type"));
        System.out.println("Type: " + root.get("type").asText());
        System.out.println("Has challenge: " + root.has("challenge"));
    }
}
