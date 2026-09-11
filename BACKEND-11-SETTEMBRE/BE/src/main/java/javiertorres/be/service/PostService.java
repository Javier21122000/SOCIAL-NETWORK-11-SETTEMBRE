package javiertorres.be.service;

import javiertorres.be.model.*;
import javiertorres.be.repository.PostRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;

@Service
public class PostService {
    private final PostRepository postRepository;
    private final Path uploadDirectory;
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;
    private static final int MAX_FILES = 5;
    private static final Set<String> PHOTO_TYPES = Set.of("image/jpeg", "image/png", "image/heic", "image/heif");
    private static final Set<String> DOCUMENT_TYPES = Set.of("application/pdf", "text/plain");

    public PostService(PostRepository postRepository, @Value("${app.upload-dir:uploads}") String uploadDirectory) {
        this.postRepository = postRepository;
        this.uploadDirectory = Paths.get(uploadDirectory).toAbsolutePath().normalize();
        try { Files.createDirectories(this.uploadDirectory); }
        catch (IOException exception) { throw new IllegalStateException("Impossibile creare la cartella upload", exception); }
    }

    private void handleFileUpload(MultipartFile file, Post post, String url, String contentType, String testoEstrattoOcr) {
        if (PHOTO_TYPES.contains(contentType)) {
            Foto photo = new Foto();
            photo.setUrlFile(url);
            photo.setPost(post);
            post.getFoto().add(photo);
        } else {
            Documento document = new Documento();
            document.setUrlFile(url);
            document.setTestoEstrattoOcr(testoEstrattoOcr == null || testoEstrattoOcr.isBlank() ? null : testoEstrattoOcr.trim());
            document.setPost(post);
            post.getDocumenti().add(document);
        }
    }
    public List<Post> findAll() { return postRepository.findAll(); }
    public Post create(Post post) {
        if (post.getCreatedAt() == null) post.setCreatedAt(Instant.now());
        if (post.getFoto() != null) post.getFoto().forEach(f -> f.setPost(post));
        if (post.getDocumenti() != null) post.getDocumenti().forEach(d -> d.setPost(post));
        return postRepository.save(post);
    }

    @Transactional
    public Post createMultipart(String didascalia, Indirizzo indirizzo, String testoEstrattoOcr, List<MultipartFile> files) {
        validateAddress(indirizzo);
        if (files == null || files.isEmpty() || files.size() > MAX_FILES) {
            throw new IllegalArgumentException("Sono richiesti da 1 a 5 file");
        }
        Post post = new Post();
        post.setDidascalia(didascalia == null ? "" : didascalia.trim());
        post.setIndirizzo(indirizzo);
        post.setCreatedAt(Instant.now());
        post.setFoto(new ArrayList<>());
        post.setDocumenti(new ArrayList<>());
        List<Path> writtenFiles = new ArrayList<>();
        try {
            for (MultipartFile file : files) {
                validateFile(file);
                String contentType = normalizedContentType(file);
                String extension = safeExtension(file.getOriginalFilename());
                String storedName = UUID.randomUUID() + extension;
                Path target = uploadDirectory.resolve(storedName).normalize();
                if (!target.getParent().equals(uploadDirectory)) throw new IllegalArgumentException("Nome file non valido");
                try (var input = file.getInputStream()) {
                    Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
                }
                writtenFiles.add(target);
                String url = "/uploads/" + storedName;
                handleFileUpload(file, post, url, contentType, testoEstrattoOcr);
            }
            return postRepository.save(post);
        } catch (IOException | RuntimeException exception) {
            writtenFiles.forEach(path -> { try { Files.deleteIfExists(path); } catch (IOException ignored) { } });
            if (exception instanceof IllegalArgumentException illegalArgumentException) throw illegalArgumentException;
            throw new IllegalStateException("Impossibile salvare gli allegati", exception);
        }
    }

    private void validateAddress(Indirizzo address) {
        if (address == null || address.getLuogo() == null || address.getLuogo().isBlank()
                || address.getLatitudine() == null || !Double.isFinite(address.getLatitudine())
                || address.getLongitudine() == null || !Double.isFinite(address.getLongitudine())
                || Math.abs(address.getLatitudine()) > 90 || Math.abs(address.getLongitudine()) > 180) {
            throw new IllegalArgumentException("Indirizzo e coordinate non validi");
        }
        address.setLuogo(address.getLuogo().trim());
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Gli allegati non possono essere vuoti");
        if (file.getSize() > MAX_FILE_SIZE) throw new IllegalArgumentException("Ogni file deve essere al massimo 10 MB");
        String type = normalizedContentType(file);
        if (!PHOTO_TYPES.contains(type) && !DOCUMENT_TYPES.contains(type)) {
            throw new IllegalArgumentException("Formato non supportato: " + type);
        }
        String extension = safeExtension(file.getOriginalFilename());
        boolean validPhoto = PHOTO_TYPES.contains(type) && Set.of(".jpg", ".jpeg", ".png", ".heic", ".heif").contains(extension);
        boolean validDocument = DOCUMENT_TYPES.contains(type) && Set.of(".pdf", ".txt").contains(extension);
        if (!validPhoto && !validDocument) throw new IllegalArgumentException("Estensione e tipo del file non corrispondono");
    }

    private String normalizedContentType(MultipartFile file) {
        return Optional.ofNullable(file.getContentType()).orElse("application/octet-stream").toLowerCase(Locale.ROOT);
    }

    private String safeExtension(String originalName) {
        if (originalName == null) return "";
        String cleanName = Paths.get(originalName).getFileName().toString();
        int dot = cleanName.lastIndexOf('.');
        return dot < 0 ? "" : cleanName.substring(dot).toLowerCase(Locale.ROOT);
    }
    @Transactional
    public void delete(UUID id) {
        Post post = postRepository.findById(id).orElseThrow();
        List<String> urls = new ArrayList<>();
        if (post.getFoto() != null) post.getFoto().forEach(photo -> urls.add(photo.getUrlFile()));
        if (post.getDocumenti() != null) post.getDocumenti().forEach(document -> urls.add(document.getUrlFile()));
        postRepository.delete(post);
        urls.forEach(this::deleteStoredFile);
    }

    private void deleteStoredFile(String url) {
        if (url == null || !url.startsWith("/uploads/")) return;
        Path target = uploadDirectory.resolve(url.substring("/uploads/".length())).normalize();
        if (!target.getParent().equals(uploadDirectory)) return;
        try { Files.deleteIfExists(target); }
        catch (IOException exception) { throw new IllegalStateException("Post eliminato, ma non è stato possibile rimuovere un allegato", exception); }
    }
    public Post updateDidascalia(UUID id, String didascalia) {
        Post post = postRepository.findById(id).orElseThrow();
        post.setDidascalia(didascalia);
        return postRepository.save(post);
    }
}
